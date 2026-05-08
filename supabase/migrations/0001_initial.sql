-- AISLE — initial schema (PRD §6, build brief §6)
--
-- Run this in the Supabase SQL editor or via `supabase db push` after `supabase init`.
-- Then add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to .env.local.
--
-- Design notes:
-- - All entities scope to a `project` (one wedding). A user can be member of multiple projects (Planner tier).
-- - Row-Level Security enforces:
--     1. Users only see projects they're members of.
--     2. The "dress firewall" — partner-role members never see rows tagged gate_scope when that gate is on.
-- - The append-only ledger uses a trigger to enforce immutability.
-- - Approval tokens (build brief §8.3) are issued atomically with `approval.status = 'approved'`.

-- =====================================================================
-- Extensions + helpers
-- =====================================================================

create extension if not exists pgcrypto;

-- Short, sortable IDs (replaces NanoID / cuid).
create or replace function aisle_id() returns text as $$
  select encode(gen_random_bytes(8), 'base64')
    -- URL-safe trim
    || extract(epoch from clock_timestamp())::bigint::text;
$$ language sql volatile;

-- =====================================================================
-- Profiles + project membership
-- =====================================================================

-- Hooked to Supabase auth.users via id.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "users see their own profile"
  on profiles for select using (auth.uid() = id);
create policy "users update their own profile"
  on profiles for update using (auth.uid() = id);

-- A project = one wedding. Owned by an organizer.
create table if not exists projects (
  id text primary key default aisle_id(),
  name text not null,
  created_at timestamptz default now(),
  -- The brief lives here for fast access; full brief details inline.
  organizer_name text not null,
  partner_name text not null,
  date_window text,
  region text,
  guest_count int default 100,
  budget_usd int default 50000,
  vibe text,
  cultural text default 'secular',
  formality_tone text default 'modern',
  destination boolean default false,
  wedding_date date,
  brief_locked boolean default false,
  brief_locked_at timestamptz,
  -- Operational state
  paused boolean default false,
  paused_reason text,
  day_of_mode boolean default false,
  plan text default 'couple_plus',
  -- Maestro display name
  maestro_name text,
  ceremony_tradition text default 'humanist',
  -- Gates (PRD §2.3)
  gate_dress boolean default false,
  gate_partner_gift boolean default false,
  gate_honeymoon boolean default false,
  gate_speech boolean default false,
  gate_vows_organizer boolean default false,
  gate_vows_partner boolean default false
);

create index projects_created_at_idx on projects(created_at desc);

-- Project membership defines role (organizer / partner / planner) per user per project.
create table if not exists project_members (
  project_id text references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('organizer','partner','planner','vendor')),
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);
alter table project_members enable row level security;
create policy "members see their own memberships"
  on project_members for select using (auth.uid() = user_id);

-- Helper view: am I a member of this project, with what role?
create or replace function viewer_role(p text) returns text as $$
  select role from project_members where project_id = p and user_id = auth.uid() limit 1;
$$ language sql stable;

-- The dress firewall: partner-role users cannot see rows tagged with a scope when that gate is on.
create or replace function row_visible(p_id text, scope text) returns boolean as $$
  select case
    -- Organizers and planners see everything.
    when viewer_role(p_id) in ('organizer','planner') then true
    -- Partner role sees only ungated rows or rows whose gate is off.
    when viewer_role(p_id) = 'partner' then
      scope is null or
      coalesce((select case scope
        when 'dress' then gate_dress
        when 'partner_gift' then gate_partner_gift
        when 'honeymoon' then gate_honeymoon
        when 'speech' then gate_speech
        when 'vows_organizer' then gate_vows_organizer
        when 'vows_partner' then gate_vows_partner
        else false end
        from projects where id = p_id), false) = false
    else false
  end
$$ language sql stable;

alter table projects enable row level security;
create policy "members see their projects"
  on projects for select using (
    exists (select 1 from project_members where project_id = id and user_id = auth.uid())
  );
create policy "organizers and planners update"
  on projects for update using (viewer_role(id) in ('organizer','planner'));

-- =====================================================================
-- Brief-derived entities
-- =====================================================================

create table if not exists vendors (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  name text not null,
  category text not null,
  city text,
  fit_score int default 0,
  price_bracket text,
  notes text,
  status text default 'shortlisted',
  estimate_usd int,
  contracted_usd int,
  paid_usd int,
  last_touch_at timestamptz default now(),
  gate_scope text,                        -- 'dress' for bridal salons, etc.
  verified boolean default false,
  -- Gmail integration: bind to a vendor by email address(es)
  email_addresses text[] default '{}',
  thread_count int default 0
);
create index vendors_project_idx on vendors(project_id);
create index vendors_email_addresses_idx on vendors using gin(email_addresses);
alter table vendors enable row level security;
create policy "vendors visible to project members per gate"
  on vendors for select using (row_visible(project_id, gate_scope));
create policy "organizers update vendors"
  on vendors for all using (viewer_role(project_id) in ('organizer','planner'));

create table if not exists vendor_messages (
  id text primary key default aisle_id(),
  vendor_id text references vendors(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  at timestamptz default now(),
  direction text check (direction in ('inbound','outbound')),
  body text,
  parsed_intent text,
  quoted_usd int,
  -- Gmail provenance
  gmail_message_id text unique,
  gmail_thread_id text,
  from_addr text,
  to_addr text,
  subject text
);
create index vendor_messages_vendor_idx on vendor_messages(vendor_id, at desc);
create index vendor_messages_gmail_thread_idx on vendor_messages(gmail_thread_id);
alter table vendor_messages enable row level security;
create policy "messages visible if vendor is"
  on vendor_messages for select using (
    exists (select 1 from vendors v where v.id = vendor_id and row_visible(v.project_id, v.gate_scope))
  );

-- =====================================================================
-- Approvals + ledger (build brief §8.3)
-- =====================================================================

create table if not exists approvals (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  created_at timestamptz default now(),
  agent text not null,
  phase text not null,
  title text not null,
  rationale text,
  risk text check (risk in ('low','medium','high')),
  action jsonb not null,
  status text default 'pending' check (status in ('pending','approved','rejected','edited')),
  resolved_at timestamptz,
  rejection_note text,
  gate_scope text,
  approval_token text unique
);
create index approvals_project_status_idx on approvals(project_id, status);
alter table approvals enable row level security;
create policy "approvals respect gate scope"
  on approvals for select using (row_visible(project_id, gate_scope));
create policy "members can resolve approvals"
  on approvals for update using (viewer_role(project_id) in ('organizer','partner','planner'));

create table if not exists ledger_events (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  at timestamptz default now(),
  actor text check (actor in ('user','agent','system')),
  agent text,
  user_id uuid references auth.users(id),
  kind text not null,
  summary text,
  meta jsonb,
  gate_scope text
);
create index ledger_project_at_idx on ledger_events(project_id, at desc);
alter table ledger_events enable row level security;
create policy "ledger respects gate scope"
  on ledger_events for select using (row_visible(project_id, gate_scope));

-- Append-only enforcement
create or replace function ledger_immutable() returns trigger as $$
begin
  raise exception 'ledger is append-only';
end;
$$ language plpgsql;
create trigger ledger_no_update before update on ledger_events
  for each row execute function ledger_immutable();
create trigger ledger_no_delete before delete on ledger_events
  for each row execute function ledger_immutable();

-- =====================================================================
-- Chat (Maestro)
-- =====================================================================

create table if not exists chat_messages (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  created_at timestamptz default now(),
  role text check (role in ('user','agent','system')),
  agent text,
  user_id uuid references auth.users(id),
  content text not null,
  gate_scope text
);
create index chat_project_created_idx on chat_messages(project_id, created_at);
alter table chat_messages enable row level security;
create policy "chat respects gate scope"
  on chat_messages for select using (row_visible(project_id, gate_scope));

-- =====================================================================
-- Budget
-- =====================================================================

create table if not exists budget_lines (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  category text not null,
  plan_usd int default 0,
  committed_usd int default 0,
  paid_usd int default 0,
  vendor_id text references vendors(id) on delete set null,
  gate_scope text,
  -- The invariant required by build brief §9.1: plan ≥ committed ≥ paid
  constraint plan_ge_committed check (plan_usd >= committed_usd),
  constraint committed_ge_paid check (committed_usd >= paid_usd)
);
create index budget_project_idx on budget_lines(project_id);
alter table budget_lines enable row level security;
create policy "budget respects gate scope"
  on budget_lines for select using (row_visible(project_id, gate_scope));

-- =====================================================================
-- Guests + households
-- =====================================================================

create table if not exists households (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  label text not null,
  side text default 'both',
  mailing_address text,
  email text,
  phone text,
  out_of_town boolean default false,
  hotel_block_reserved boolean default false,
  shuttle_seat boolean default false,
  welcome_bag boolean default false,
  save_the_date_sent_at timestamptz,
  invitation_sent_at timestamptz
);
create index households_project_idx on households(project_id);

create table if not exists guests (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  household_id text references households(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  side text default 'both',
  relationship text,
  is_child boolean default false,
  plus_one_policy text default 'none',
  plus_one_name text,
  rsvp text default 'no_response',
  meal text,
  dietary text,
  notes text,
  accessibility text,
  song_request text
);
create index guests_project_idx on guests(project_id);
create index guests_household_idx on guests(household_id);

alter table households enable row level security;
alter table guests enable row level security;
create policy "households visible to members" on households for select using (viewer_role(project_id) is not null);
create policy "guests visible to members" on guests for select using (viewer_role(project_id) is not null);

-- =====================================================================
-- Designs (mood boards, dress concepts) + stationery
-- =====================================================================

create table if not exists design_assets (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  title text not null,
  kind text not null,
  description text,
  swatches text[],
  refs text[],
  created_at timestamptz default now(),
  agent text,
  gate_scope text,
  approved boolean default false
);
create index designs_project_idx on design_assets(project_id);
alter table design_assets enable row level security;
create policy "designs respect gate scope"
  on design_assets for select using (row_visible(project_id, gate_scope));

create table if not exists stationery_suites (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  direction text not null,
  palette text[],
  font text,
  format text default 'hybrid',
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  print_run_count int,
  print_partner text,
  save_the_date_sent_at timestamptz,
  invitations_sent_at timestamptz
);
alter table stationery_suites enable row level security;
create policy "stationery visible to members" on stationery_suites for select using (viewer_role(project_id) is not null);

-- =====================================================================
-- Seating (Cartographer)
-- =====================================================================

create table if not exists seating_charts (
  project_id text primary key references projects(id) on delete cascade,
  tables jsonb default '[]'::jsonb,
  assignments jsonb default '{}'::jsonb,
  constraints jsonb default '[]'::jsonb,
  cost int default 0,
  last_solve_at timestamptz,
  locked boolean default false
);
alter table seating_charts enable row level security;
create policy "seating visible to members" on seating_charts for select using (viewer_role(project_id) is not null);

-- =====================================================================
-- Day-of, contingencies
-- =====================================================================

create table if not exists day_of_items (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  time text,
  title text,
  owner text,
  status text default 'pending',
  note text,
  tolerance_minutes int,
  critical boolean default false,
  position int default 0
);
create index day_of_project_idx on day_of_items(project_id, position);

create table if not exists contingencies (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  topic text,
  pre_approved text,
  escalation text,
  triggered boolean default false,
  triggered_at timestamptz,
  trigger_note text
);
alter table day_of_items enable row level security;
alter table contingencies enable row level security;
create policy "day-of visible to members" on day_of_items for select using (viewer_role(project_id) is not null);
create policy "contingencies visible to members" on contingencies for select using (viewer_role(project_id) is not null);

-- =====================================================================
-- The big rest: all the modules that aren't load-bearing for v1 launch
-- =====================================================================

create table if not exists thank_yous (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  guest_id text references guests(id) on delete cascade,
  guest_name text,
  gift_description text,
  draft_body text,
  status text default 'no_gift',
  sent_at timestamptz
);

create table if not exists registry_items (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  item text,
  vendor text,
  price_usd int,
  category text,
  url text,
  status text default 'wanted',
  purchased_by text
);

create table if not exists honeymoon_segments (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  city text,
  country text,
  arrival_date date,
  departure_date date,
  hotel text,
  notes text,
  surprise boolean default false
);

create table if not exists hotel_blocks (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  hotel text,
  city text,
  nightly_rate_usd int,
  rooms_blocked int,
  rooms_booked int default 0,
  release_date date,
  notes text
);

create table if not exists shuttles (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  route text,
  pickup_time text,
  capacity int,
  reserved_seats int default 0
);

create table if not exists welcome_bag_items (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  item text,
  unit_cost_usd int,
  rationale text
);

create table if not exists music_cues (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  slot text,
  song text,
  artist text,
  notes text,
  guest_request boolean default false,
  approved boolean default false
);

create table if not exists ceremony_sections (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  kind text,
  title text,
  body text,
  reader text,
  approved boolean default false,
  tradition text,
  ritual_key text,
  position int default 0
);

create table if not exists wedding_party (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  name text,
  role text,
  side text,
  attire_ordered boolean default false,
  attire_size text,
  attire_color text,
  gift_idea text,
  email text
);

create table if not exists pre_events (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  kind text,
  date date,
  location text,
  host_names text[],
  invited_count int,
  notes text,
  budget_usd int
);

create table if not exists tip_envelopes (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  vendor_id text references vendors(id) on delete set null,
  recipient text,
  amount_usd int,
  cash_delivered boolean default false,
  handed_to_on_day text
);

create table if not exists memorials (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  name text,
  relationship text,
  side text,
  treatment text,
  notes text
);

create table if not exists vows (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  whose text check (whose in ('organizer','partner')),
  draft text default '',
  word_count int default 0,
  locked boolean default false,
  notes text,
  unique (project_id, whose)
);
alter table vows enable row level security;
create policy "vows visible per gate"
  on vows for select using (
    case whose
      when 'organizer' then row_visible(project_id, 'vows_organizer')
      when 'partner' then row_visible(project_id, 'vows_partner')
    end
  );

create table if not exists speeches (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  speaker text,
  draft text,
  word_count int,
  approved boolean default false
);

create table if not exists engagement_milestones (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  kind text,
  title text,
  description text,
  status text default 'idea',
  scheduled_for date
);

create table if not exists visits (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  kind text,
  vendor_id text references vendors(id) on delete set null,
  vendor_name text,
  date date,
  time text,
  location text,
  attendees text[],
  notes text,
  done boolean default false
);

create table if not exists florals (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  piece text,
  quantity int,
  primary_stems text[],
  secondary_stems text[],
  vessel_notes text,
  unit_cost int,
  approved boolean default false
);

create table if not exists rentals (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  category text,
  item text,
  quantity int,
  unit_cost int,
  notes text,
  vendor_id text references vendors(id) on delete set null
);

create table if not exists beauty_appts (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  who text,
  service text,
  start_time text,
  duration_min int,
  trial boolean default false,
  notes text
);

create table if not exists cake_specs (
  project_id text primary key references projects(id) on delete cascade,
  tiers int default 3,
  flavors text[],
  fillings text[],
  frosting_style text,
  decoration_notes text,
  servings int,
  allergen_notes text,
  vendor_id text references vendors(id) on delete set null,
  approved boolean default false
);

create table if not exists bar_programs (
  project_id text primary key references projects(id) on delete cascade,
  style text default 'open',
  signature_count int default 2,
  item_menu jsonb default '[]'::jsonb,
  estimated_alcohol_budget int,
  notes text
);

create table if not exists wedding_sites (
  project_id text primary key references projects(id) on delete cascade,
  slug text unique,
  hero text,
  story text,
  schedule_published boolean default false,
  rsvp_enabled boolean default false,
  registry_linked boolean default false,
  travel_guide text,
  faqs jsonb default '[]'::jsonb,
  password text
);

create table if not exists licenses (
  project_id text primary key references projects(id) on delete cascade,
  state text,
  county text,
  application_date date,
  appointment_date date,
  picked_up_at date,
  expires_at text,
  filed_at date,
  requirements text[],
  notes text
);

-- =====================================================================
-- Gmail integration
-- =====================================================================

-- One row per (user, project). Stores Google OAuth tokens and watch state.
create table if not exists gmail_connections (
  user_id uuid references auth.users(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  email_address text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text[] not null,
  history_id text,                  -- last Gmail historyId for incremental scans
  watch_expires_at timestamptz,
  alias_address text,               -- couple-name@aisle.email or whatever AISLE alias
  last_scan_at timestamptz,
  scan_filter text default 'in:inbox -from:me newer_than:30d',
  primary key (user_id, project_id)
);
alter table gmail_connections enable row level security;
create policy "users see their own gmail connection"
  on gmail_connections for all using (auth.uid() = user_id);

-- Raw inbox-scan log — every message we pulled, what we did with it.
create table if not exists inbox_messages (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  gmail_message_id text unique not null,
  gmail_thread_id text,
  from_addr text,
  to_addr text,
  subject text,
  snippet text,
  received_at timestamptz,
  raw_body text,
  -- What Triage parsed
  parsed_intent text,
  quoted_usd int,
  triage_notes text,
  -- What we did
  matched_vendor_id text references vendors(id) on delete set null,
  outcome text,                     -- 'matched_to_vendor' | 'unmatched' | 'spam' | 'noise'
  approval_id text references approvals(id) on delete set null,
  scanned_at timestamptz default now()
);
create index inbox_messages_project_idx on inbox_messages(project_id, scanned_at desc);
create index inbox_messages_thread_idx on inbox_messages(gmail_thread_id);
create index inbox_messages_outcome_idx on inbox_messages(project_id, outcome);
alter table inbox_messages enable row level security;
create policy "inbox visible to project members"
  on inbox_messages for select using (viewer_role(project_id) is not null);

-- =====================================================================
-- Realtime + helper grants
-- =====================================================================

-- Make changes to these tables broadcast via Supabase Realtime so partner / planner
-- devices update live.
alter publication supabase_realtime add table approvals;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table vendors;
alter publication supabase_realtime add table vendor_messages;
alter publication supabase_realtime add table inbox_messages;
alter publication supabase_realtime add table day_of_items;

-- =====================================================================
-- Auto-create profile on user signup
-- =====================================================================
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
