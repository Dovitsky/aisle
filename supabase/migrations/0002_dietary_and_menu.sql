-- Adds the menu + dietary tables that landed after 0001.
-- Run this AFTER 0001_initial.sql.

create table if not exists menus (
  id text primary key default aisle_id(),
  project_id text references projects(id) on delete cascade,
  course text,
  name text,
  description text,
  contains_allergens text[] default '{}',
  is_vegan boolean default false,
  is_vegetarian boolean default false,
  is_gluten_free boolean default false,
  is_dairy_free boolean default false,
  is_kosher boolean default false,
  is_halal boolean default false,
  is_pescatarian boolean default false,
  is_alcoholic boolean default false,
  vendor_id text references vendors(id) on delete set null
);
create index if not exists menus_project_idx on menus(project_id);
alter table menus enable row level security;
create policy "menus visible to members" on menus
  for select using (viewer_role(project_id) is not null);

-- Cake gets structured allergens (the JSON array column).
alter table cake_specs add column if not exists allergens text[] default '{}';

-- Guests get structured allergens + preferences (stored as JSONB so they map to
-- AllergenEntry[] and DietaryPref[] without a separate join table).
alter table guests add column if not exists allergens jsonb default '[]'::jsonb;
alter table guests add column if not exists dietary_preferences text[] default '{}';
alter table guests add column if not exists dietary_notes text;

-- Couple-set resolutions per (guestId, menuItemId).
create table if not exists dietary_resolutions (
  project_id text references projects(id) on delete cascade,
  guest_id text references guests(id) on delete cascade,
  menu_item_id text not null,                  -- can be a real menu id or 'cake_synthetic'
  kind text check (kind in ('alt_meal', 'menu_changed', 'guest_acknowledged', 'dismissed')),
  alternate_item_name text,
  note text,
  resolved_at timestamptz default now(),
  primary key (project_id, guest_id, menu_item_id)
);
alter table dietary_resolutions enable row level security;
create policy "resolutions visible to members" on dietary_resolutions
  for select using (viewer_role(project_id) is not null);

-- Per-user-per-project settings (viewer + maestro name should not be on the project row).
create table if not exists user_project_prefs (
  user_id uuid references auth.users(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  viewer_role text default 'organizer',
  maestro_name text,
  primary key (user_id, project_id)
);
alter table user_project_prefs enable row level security;
create policy "users see their own prefs" on user_project_prefs
  for all using (auth.uid() = user_id);

-- Seating chart sometimes serializes locked column as boolean; ensure it exists.
alter table seating_charts add column if not exists locked boolean default false;
