// Ritual library. hand-curated ceremony elements organized by tradition.
//
// These are templates. Couples / Cleric edit the body to fit. Names use
// {{organizer}} and {{partner}} placeholders that get substituted at insert.
//
// Source notes: liturgical and ritual descriptions are summarized from
// commonly published wedding-tradition references; for any specific tradition
// the couple should validate copy with their officiant or community.

import type { CeremonyTradition, CeremonySectionKind } from "../types";

export interface RitualTemplate {
  key: string;
  tradition: CeremonyTradition;
  kind: CeremonySectionKind;
  title: string;
  description: string;       // 1-line UI explainer
  reader?: string;           // default reader/role
  body: string;              // template text with {{organizer}} / {{partner}} placeholders
  // Whether this ritual is commonly inserted in interfaith blends.
  commonInBlends?: boolean;
}

// ---- Humanist / Secular ------------------------------------------------

const HUMANIST: RitualTemplate[] = [
  { key: "humanist_welcome", tradition: "humanist", kind: "welcome",
    title: "Welcome", reader: "Celebrant",
    description: "Opens the ceremony, names what we're doing, who we are, and why everyone is here.",
    body: `Family and friends, please be seated.\n\nWe gather here today, in this place, as people who love {{organizer}} and {{partner}}, to witness the commitment they are making to one another.\n\nMarriage, at its best, is the daily practice of choosing each other. {{organizer}} and {{partner}}, you are choosing each other in front of the people who have shaped you.` },

  { key: "humanist_giving_thanks", tradition: "humanist", kind: "blessing",
    title: "A note of thanks", reader: "Celebrant",
    description: "Acknowledges the parents, the village, anyone who can't be there.",
    body: `Before we go further, {{organizer}} and {{partner}} want to acknowledge the people who got them here. Their parents, who taught them how to love. Their friends, who have been their chosen family. And those who are no longer with us today. we feel their absence and we hold them close.` },

  { key: "humanist_intentions", tradition: "humanist", kind: "vows",
    title: "Statement of intentions", reader: "Celebrant",
    description: "The 'do you take' moment, secular phrasing.",
    body: `{{organizer}}, do you take {{partner}} to be your partner. to love and honor, in joy and in difficulty, for as long as you both shall live?\n\n,  I do.\n\n{{partner}}, do you take {{organizer}} to be your partner. to love and honor, in joy and in difficulty, for as long as you both shall live?\n\n,  I do.` },

  { key: "humanist_pronouncement", tradition: "humanist", kind: "pronouncement",
    title: "Pronouncement", reader: "Celebrant",
    description: "The legal moment.",
    body: `By the power vested in me by the State of [STATE], and witnessed by the people gathered here, I now pronounce you married. You may kiss.` },
];

// ---- Civil -------------------------------------------------------------

const CIVIL: RitualTemplate[] = [
  { key: "civil_authority", tradition: "civil", kind: "welcome", reader: "Officiant",
    title: "Statement of authority",
    description: "Standard civil opening required by most jurisdictions.",
    body: `We are gathered here today, in accordance with the laws of [STATE], to witness and certify the marriage of {{organizer}} and {{partner}}. The couple has met all legal requirements, and we proceed to the exchange of consent.` },

  { key: "civil_declaration", tradition: "civil", kind: "vows", reader: "Officiant",
    title: "Declaration of consent",
    description: "Required-language consent statement.",
    body: `Do you, {{organizer}}, take {{partner}} as your lawful spouse, to have and to hold, from this day forward?\n\n,  I do.\n\nAnd do you, {{partner}}, take {{organizer}} as your lawful spouse, to have and to hold, from this day forward?\n\n,  I do.` },

  { key: "civil_pronouncement", tradition: "civil", kind: "pronouncement", reader: "Officiant",
    title: "Pronouncement", description: "Statutory pronouncement.",
    body: `By the authority granted to me by the State of [STATE], I hereby declare that you are now lawfully married.` },
];

// ---- Catholic ----------------------------------------------------------

const CATHOLIC: RitualTemplate[] = [
  { key: "catholic_sign_of_cross", tradition: "catholic", kind: "prayer", reader: "Priest",
    title: "Sign of the Cross & Greeting",
    description: "Opening rite of the nuptial liturgy.",
    body: `In the name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nThe grace of our Lord Jesus Christ, the love of God, and the communion of the Holy Spirit be with you all.` },

  { key: "catholic_liturgy_word", tradition: "catholic", kind: "reading",
    title: "Liturgy of the Word", reader: "Lectors + Priest",
    description: "First Reading (Old Testament), Responsorial Psalm, Second Reading (New Testament), Gospel. Couple selects from approved options.",
    body: `[FIRST READING. Old Testament. Common: Genesis 2:18-24, or Tobit 8:4b-8.]\n\n[RESPONSORIAL PSALM. sung. Common: Psalm 128.]\n\n[SECOND READING. New Testament. Common: 1 Corinthians 12:31-13:8a, or Colossians 3:12-17.]\n\n[GOSPEL ACCLAMATION + GOSPEL. Common: Matthew 19:3-6 or John 15:9-12, read by the Priest.]\n\n[HOMILY. by the Priest.]` },

  { key: "catholic_consent", tradition: "catholic", kind: "vows", reader: "Priest",
    title: "Exchange of Consent", description: "The vows in Catholic form.",
    body: `{{organizer}}, do you take {{partner}} for your lawful spouse, to have and to hold from this day forward, for better, for worse, for richer, for poorer, in sickness and in health, until death do you part?\n\n,  I do.\n\n{{partner}}, do you take {{organizer}} for your lawful spouse, to have and to hold from this day forward, for better, for worse, for richer, for poorer, in sickness and in health, until death do you part?\n\n,  I do.` },

  { key: "catholic_blessing_of_rings", tradition: "catholic", kind: "ring_exchange", reader: "Priest + couple",
    title: "Blessing & Exchange of Rings",
    description: "Priest blesses the rings; couple exchanges with formula.",
    body: `Priest: Lord, bless these rings, which we bless in your name. Grant that those who wear them may always have a deep faith in each other. May they do your will and always live together in peace, in mutual love, and in happiness. Through Christ our Lord. Amen.\n\n{{organizer}}: {{partner}}, take this ring as a sign of my love and fidelity. In the name of the Father, and of the Son, and of the Holy Spirit.\n\n{{partner}}: {{organizer}}, take this ring as a sign of my love and fidelity. In the name of the Father, and of the Son, and of the Holy Spirit.` },

  { key: "catholic_nuptial_blessing", tradition: "catholic", kind: "blessing", reader: "Priest",
    title: "Nuptial Blessing",
    description: "Priest blesses the couple after the Lord's Prayer.",
    body: `Father, by your power you have made everything out of nothing. In the beginning you created the universe and made mankind in your own likeness. You gave man the constant help of woman, so that man and woman should no longer be two, but one flesh. and you teach us that what you have united may never be divided.\n\nLook with kindness on {{organizer}} and {{partner}}, who today are united in marriage. Bless them with the gift of children and enrich their lives. Through Christ our Lord. Amen.` },

  { key: "catholic_communion", tradition: "catholic", kind: "communion", reader: "Priest",
    title: "Liturgy of the Eucharist (if full Mass)",
    description: "Skip if ceremony is outside Mass.",
    body: `[Liturgy of the Eucharist follows the standard Catholic Mass. preparation of gifts, Eucharistic Prayer, Communion Rite. Not included if the ceremony is conducted outside Mass.]` },

  { key: "catholic_dismissal", tradition: "catholic", kind: "pronouncement", reader: "Priest",
    title: "Final Blessing & Dismissal",
    description: "Priest's closing.",
    body: `May Almighty God, by his Word, with which he created all things, may he bless and confirm what he has done in you today.\n\nIn the name of the Father, and of the Son, and of the Holy Spirit. Amen.\n\nGo in peace. The marriage of {{organizer}} and {{partner}} is concluded.` },
];

// ---- Protestant --------------------------------------------------------

const PROTESTANT: RitualTemplate[] = [
  { key: "protestant_invocation", tradition: "protestant", kind: "prayer", reader: "Pastor",
    title: "Invocation", description: "Opening prayer.",
    body: `Eternal God, our Creator and Redeemer, as you gladdened the wedding at Cana in Galilee by the presence of your Son, so by his presence now bring your joy to this wedding. Look mercifully upon {{organizer}} and {{partner}}, and grant that they, rejoicing in all your gifts, may at length celebrate the marriage feast of the Lamb. Amen.` },

  { key: "protestant_charge", tradition: "protestant", kind: "welcome", reader: "Pastor",
    title: "Charge to the Couple", description: "Pastor's address.",
    body: `{{organizer}} and {{partner}}, the covenant of marriage was established by God, who created us male and female for each other. With his presence and power, Jesus graced a wedding at Cana of Galilee. The marriage which you are about to enter is intended by God to be a permanent and joyful union.` },

  { key: "protestant_consent", tradition: "protestant", kind: "vows", reader: "Pastor",
    title: "Vows", description: "Traditional Protestant vow form.",
    body: `{{organizer}}, will you have {{partner}} to be your wife/husband, to live together in the covenant of marriage? Will you love {{partner}}, comfort, honor, and keep, in sickness and in health; and forsaking all others, be faithful as long as you both shall live?\n\n,  I will.\n\n[Repeat for partner.]` },

  { key: "protestant_pronouncement", tradition: "protestant", kind: "pronouncement", reader: "Pastor",
    title: "Pronouncement",
    description: "Pastor's pronouncement.",
    body: `Forasmuch as {{organizer}} and {{partner}} have consented together in holy wedlock, and have witnessed the same before God and this company, by the authority of the State of [STATE] and the Church, I pronounce them married, in the name of the Father, and of the Son, and of the Holy Spirit. Amen.` },
];

// ---- Orthodox Christian ------------------------------------------------

const ORTHODOX: RitualTemplate[] = [
  { key: "orthodox_betrothal", tradition: "orthodox_christian", kind: "ritual", reader: "Priest",
    title: "Service of Betrothal", description: "Priest blesses and exchanges rings three times.",
    body: `The priest takes the rings and signs the betrothed with each, three times, on the forehead. The rings are then exchanged on the right hand three times by the koumbaros (sponsor), symbolizing the union of the couple in the Holy Trinity.` },

  { key: "orthodox_crowning", tradition: "orthodox_christian", kind: "ritual", reader: "Priest",
    title: "Crowning", description: "The defining moment of an Orthodox wedding.",
    body: `The priest places crowns on the heads of {{organizer}} and {{partner}}, joined by a white ribbon. The crowns symbolize martyrdom for one another and the establishment of a new family. The koumbaros exchanges the crowns over the couple's heads three times.` },

  { key: "orthodox_common_cup", tradition: "orthodox_christian", kind: "communion", reader: "Priest",
    title: "Common Cup",
    description: "Couple shares wine three times.",
    body: `The priest offers the couple the common cup of wine. Each takes three sips, recalling Christ's first miracle at the wedding in Cana. The cup symbolizes the shared joys and trials of married life.` },

  { key: "orthodox_dance_of_isaiah", tradition: "orthodox_christian", kind: "ritual", reader: "Priest + couple",
    title: "Dance of Isaiah",
    description: "Couple's first walk as a married couple, around the altar.",
    body: `The priest leads the couple, still wearing the crowns, around the altar three times. the Dance of Isaiah. taking their first steps together as a married couple in the presence of God.` },
];

// ---- Jewish ------------------------------------------------------------

const JEWISH: RitualTemplate[] = [
  { key: "jewish_bedeken", tradition: "jewish", kind: "ritual", reader: "Couple + family",
    title: "Bedeken (veiling)", description: "Before the procession; bride is veiled.",
    body: `Before the procession, {{partner}} is veiled by {{organizer}}, accompanied by family. The bedeken recalls Rebecca veiling herself before meeting Isaac. It is also a private moment for the couple to see each other before the chuppah.` },

  { key: "jewish_chuppah", tradition: "jewish", kind: "welcome", reader: "Rabbi",
    title: "Chuppah procession",
    description: "The couple stands under the chuppah. the wedding canopy. symbolizing their new home.",
    body: `The chuppah is held aloft by family and friends. {{organizer}} and {{partner}} are escorted by their parents to the chuppah, where the rabbi greets them and the community.\n\nBaruch ha-ba b'shem Adonai. Blessed is the one who comes in the name of the Eternal.`,
    commonInBlends: true },

  { key: "jewish_circling", tradition: "jewish", kind: "ritual", reader: "Couple",
    title: "Circling (hakafot)",
    description: "Traditionally bride circles groom seven times; egalitarian couples circle each other.",
    body: `{{partner}} (or both partners in turn) circles {{organizer}} seven times, recalling the seven blessings to come. The seven circles also evoke the seven days of creation. together you are creating a new world.` },

  { key: "jewish_birkat_erusin", tradition: "jewish", kind: "blessing", reader: "Rabbi",
    title: "Birkat Erusin (betrothal blessings)",
    description: "First of the wedding blessings; couple shares the first cup of wine.",
    body: `Baruch atah Adonai, Eloheinu Melech ha'olam, borei p'ri ha-gafen.\n\nBlessed are You, Eternal our God, Sovereign of the universe, who has sanctified us by Your commandments and given us this sacred covenant.` },

  { key: "jewish_ring_harei_at", tradition: "jewish", kind: "ring_exchange", reader: "Couple",
    title: "Ring exchange. Harei At",
    description: "The legally binding moment.",
    body: `{{organizer}} places the ring on {{partner}}'s finger and recites:\n\nHarei at m'kudeshet li b'taba'at zo k'dat Moshe v'Yisrael.\n\nBehold, you are consecrated to me with this ring, in accordance with the tradition of Moses and Israel.\n\n[Many couples now exchange rings reciprocally with adapted Hebrew.]` },

  { key: "jewish_ketubah_reading", tradition: "jewish", kind: "reading", reader: "Officiant or honored guest",
    title: "Ketubah reading",
    description: "Wedding contract. read aloud after signing earlier with two witnesses.",
    body: `[The Ketubah, signed before the ceremony by two witnesses, is read aloud. traditionally in Aramaic, often also in English. The Ketubah outlines the couple's commitments and the values of their union. After reading, it is presented to the couple.]` },

  { key: "jewish_sheva_brachot", tradition: "jewish", kind: "blessing", reader: "Seven honored guests + Rabbi",
    title: "Sheva Brachot (seven blessings)",
    description: "Seven blessings, traditionally divided among honored guests.",
    body: `1. Blessed are You... creator of the fruit of the vine.\n2. Blessed are You... who created all things for Your glory.\n3. Blessed are You... creator of humanity.\n4. Blessed are You... who created us in Your image, fashioning perpetual life.\n5. May the barren one rejoice as her children are gathered to her in joy.\n6. Bring abounding joy to these loving companions, as You did for Your creations in the Garden of Eden.\n7. Blessed are You, Adonai, who causes the bridegroom and bride to rejoice together.\n\n[Each blessing in full Hebrew + English; given by seven honored guests.]` },

  { key: "jewish_breaking_glass", tradition: "jewish", kind: "ritual", reader: "Couple + community",
    title: "Breaking of the glass",
    description: "Closes the ceremony; community shouts Mazel Tov.",
    body: `{{organizer}} stomps on a wrapped glass, breaking it. The shattering recalls the destruction of the Temple in Jerusalem and reminds us that joy and sorrow are intertwined; even in our happiest moments, we remember loss.\n\nThe community shouts: Mazel Tov!`,
    commonInBlends: true },

  { key: "jewish_yichud", tradition: "jewish", kind: "ritual", reader: "Couple",
    title: "Yichud (private moment)",
    description: "Couple's first private moment after the ceremony. about 15 minutes alone together.",
    body: `Following the ceremony, {{organizer}} and {{partner}} retreat for yichud. a private room, the two of them, eating together for the first time as a married couple. Coordinator holds guests at cocktail hour for ~15 minutes.` },
];

// ---- Hindu -------------------------------------------------------------

const HINDU: RitualTemplate[] = [
  { key: "hindu_baraat", tradition: "hindu", kind: "welcome", reader: "Family + groom",
    title: "Baraat (groom's procession)",
    description: "Groom arrives in joyful procession with family, often with music and dancing.",
    body: `{{partner}} arrives in procession. the baraat. accompanied by family, friends, and live music. The groom is often on horseback or in a decorated car. The bride's family welcomes the procession at the entrance with garlands and an aarti.` },

  { key: "hindu_var_mala", tradition: "hindu", kind: "ritual", reader: "Couple",
    title: "Var Mala (exchange of garlands)",
    description: "Couple exchange floral garlands. first acknowledgment of acceptance.",
    body: `{{organizer}} and {{partner}} exchange flower garlands (jaimala / var mala). Family and friends often try to lift the bride or groom playfully so the other can't reach. a joyful struggle that begins the celebration.` },

  { key: "hindu_kanyadaan", tradition: "hindu", kind: "ritual", reader: "Bride's father / family",
    title: "Kanyadaan (giving of the bride)",
    description: "The bride's father gives her to the groom, joining the two families.",
    body: `The bride's father places her hand in {{partner}}'s hand, joining the two families. Sacred mantras are recited. This is one of the most emotional moments of the ceremony. the bride's parents formally entrust her to her partner.` },

  { key: "hindu_mangal_pheras", tradition: "hindu", kind: "ritual", reader: "Priest + couple",
    title: "Mangal Pheras (circling the fire)",
    description: "Couple circles the sacred fire (agni) four times, exchanging vows at each.",
    body: `The couple, with their saris/clothing tied together, circles the sacred fire four times. Each phera represents one of the four aims of life:\n1. Dharma. duty, righteousness\n2. Artha. prosperity\n3. Kama. love, family, joy\n4. Moksha. liberation, spiritual fulfillment\n\nThe priest chants Vedic mantras throughout.` },

  { key: "hindu_saptapadi", tradition: "hindu", kind: "vows", reader: "Priest + couple",
    title: "Saptapadi (seven steps / seven vows)",
    description: "The seven steps that legally bind the marriage in Hindu tradition.",
    body: `The couple takes seven steps together, each accompanied by a vow:\n\n1. To nourish each other\n2. To grow together in strength\n3. To preserve our wealth\n4. To share our joys and sorrows\n5. To care for our children\n6. To be together for all seasons of life\n7. To remain lifelong friends.\n\nIn many traditions, the saptapadi is the moment of legal marriage.` },

  { key: "hindu_sindoor_mangalsutra", tradition: "hindu", kind: "ritual", reader: "Groom + couple",
    title: "Sindoor & Mangalsutra",
    description: "Groom places a sacred necklace on the bride and applies vermilion to her hair part.",
    body: `{{partner}} ties the mangalsutra. a sacred necklace. around {{organizer}}'s neck, and applies sindoor (vermilion) to the part in her hair, marking her as a married woman in the Hindu tradition.` },

  { key: "hindu_ashirvad", tradition: "hindu", kind: "blessing", reader: "Elders + priest",
    title: "Ashirvad (blessings)",
    description: "Elders bless the couple.",
    body: `The newly married couple bows before their parents, grandparents, and elders, who place their hands on the couple's heads and offer blessings. for prosperity, health, children, and a long life together.` },
];

// ---- Muslim (Nikah) ----------------------------------------------------

const MUSLIM: RitualTemplate[] = [
  { key: "muslim_khutbah", tradition: "muslim", kind: "welcome", reader: "Imam",
    title: "Khutbah (sermon)",
    description: "Opening sermon by the imam; recitation from the Quran.",
    body: `The imam delivers the Khutbatun-Nikah, recalling the importance of marriage in Islamic tradition, recitations from the Quran, and praise to Allah.\n\n"And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy." (Quran 30:21)` },

  { key: "muslim_ijab_qubul", tradition: "muslim", kind: "vows", reader: "Imam + couple",
    title: "Ijab and Qubul (proposal & acceptance)",
    description: "The defining moment. proposal from one party, acceptance from the other, three times.",
    body: `The imam asks {{organizer}} three times whether she accepts {{partner}} as her husband, and {{partner}} three times whether he accepts {{organizer}} as his wife. Each must consent freely and clearly, witnessed by two adult witnesses.\n\nThis is the moment that constitutes the marriage in Islamic law.` },

  { key: "muslim_mahr", tradition: "muslim", kind: "ritual", reader: "Imam + couple",
    title: "Mahr (specifying the dowry)",
    description: "The mahr is a gift from the groom to the bride, agreed upon and stated publicly.",
    body: `The mahr. a gift from {{partner}} to {{organizer}}. is publicly announced. It can be money, a ring, a religious item, or anything mutually agreed. The mahr is the bride's property, her right alone.` },

  { key: "muslim_signing", tradition: "muslim", kind: "ritual", reader: "Couple + witnesses",
    title: "Signing of the Nikah-nama",
    description: "Marriage contract signed by the couple, the imam, and two witnesses.",
    body: `The Nikah-nama (marriage contract) is signed by {{organizer}}, {{partner}}, the imam, and two adult witnesses. It records the names, the mahr, any conditions agreed by the couple, and the date.` },

  { key: "muslim_dua", tradition: "muslim", kind: "prayer", reader: "Imam",
    title: "Du'a (closing prayer)",
    description: "Imam offers final prayers for the couple.",
    body: `The imam offers du'a. supplications for the couple's happiness, prosperity, righteous children, and a marriage filled with mercy and love. The community responds: Ameen.` },
];

// ---- Buddhist ----------------------------------------------------------

const BUDDHIST: RitualTemplate[] = [
  { key: "buddhist_three_refuges", tradition: "buddhist", kind: "prayer", reader: "Officiant",
    title: "Taking the Three Refuges",
    description: "Couple takes refuge in the Buddha, the Dharma, and the Sangha.",
    body: `{{organizer}} and {{partner}} kneel before the altar and take the Three Refuges:\n\nBuddham saranam gacchami. I take refuge in the Buddha.\nDhammam saranam gacchami. I take refuge in the Dharma.\nSangham saranam gacchami. I take refuge in the Sangha.\n\nRepeated three times.` },

  { key: "buddhist_offerings", tradition: "buddhist", kind: "ritual", reader: "Couple",
    title: "Offering of flowers, candle, and incense",
    description: "Symbolic offerings on the altar.",
    body: `The couple together places three offerings on the altar:\n\n,  Flowers, for the impermanence and beauty of life.\n,  A lit candle, for the light of wisdom.\n,  Incense, for the fragrance of pure conduct.` },

  { key: "buddhist_metta_vows", tradition: "buddhist", kind: "vows", reader: "Couple",
    title: "Vows of loving-kindness (metta)",
    description: "Couple vows to practice loving-kindness, compassion, sympathetic joy, and equanimity together.",
    body: `{{organizer}} and {{partner}} face each other and vow:\n\nTo practice loving-kindness (metta) toward one another.\nTo practice compassion (karuna) when the other suffers.\nTo practice sympathetic joy (mudita) in each other's happiness.\nTo practice equanimity (upekkha) through the changes of life.\n\nMay we be a refuge for one another.` },

  { key: "buddhist_bell", tradition: "buddhist", kind: "pronouncement", reader: "Officiant",
    title: "Sounding of the bell",
    description: "Three rings to mark the marriage.",
    body: `The officiant rings the bell three times. The pure sound marks the moment {{organizer}} and {{partner}} are joined as life partners.` },
];

// ---- Sikh (Anand Karaj) ------------------------------------------------

const SIKH: RitualTemplate[] = [
  { key: "sikh_ardas", tradition: "sikh", kind: "prayer", reader: "Granthi",
    title: "Ardas (opening prayer)", description: "Standing prayer before the Guru Granth Sahib.",
    body: `The granthi leads the congregation in Ardas. the standing prayer that begins the Anand Karaj, asking for the blessings of the Gurus on the marriage of {{organizer}} and {{partner}}.` },

  { key: "sikh_palla", tradition: "sikh", kind: "ritual", reader: "Bride's father + couple",
    title: "Palla ceremony",
    description: "Bride's father places one end of the groom's scarf into the bride's hand, joining them.",
    body: `The bride's father places one end of {{partner}}'s long scarf (palla) into {{organizer}}'s hand. They are now joined for the lavan.` },

  { key: "sikh_lavan", tradition: "sikh", kind: "vows", reader: "Granthi + couple",
    title: "Lavan (four marriage rounds)",
    description: "Couple circles the Guru Granth Sahib four times as the four lavan are sung.",
    body: `The four lavan, composed by Guru Ram Das, are sung. After each, the couple rises and circles the Guru Granth Sahib, the bride following the groom holding the palla.\n\n1. The duty of the householder.\n2. The yearning of the soul for the divine.\n3. The detachment from worldly things.\n4. The harmony of soul with the divine. and the union of the couple as one in the Lord.` },

  { key: "sikh_kara_prashad", tradition: "sikh", kind: "ritual", reader: "Granthi + congregation",
    title: "Kara Prashad",
    description: "Sweet sacrament shared with all in attendance.",
    body: `The granthi distributes Kara Prashad. a sacrament of flour, sugar, and ghee. to all present, beginning with the couple. All who attended share equally.` },
];

// ---- Quaker ------------------------------------------------------------

const QUAKER: RitualTemplate[] = [
  { key: "quaker_silence_open", tradition: "quaker", kind: "welcome", reader: "Clerk of meeting",
    title: "Settling into silence",
    description: "Quaker weddings happen within a Meeting for Worship. Begins in silence.",
    body: `The clerk welcomes the meeting and reminds those gathered that this is a Meeting for Worship in the manner of Friends. The community settles into silence, waiting upon the Spirit.\n\nThere is no officiant. The couple marries each other, before God and the meeting.` },

  { key: "quaker_promise", tradition: "quaker", kind: "vows", reader: "Couple",
    title: "Marriage promise",
    description: "Couple speaks promise when ready, in their own words or traditional form.",
    body: `When they are moved to do so, {{organizer}} and {{partner}} stand and clasp hands. {{organizer}} speaks first:\n\n"In the presence of God and these our Friends, I take {{partner}} to be my spouse, promising with divine assistance to be unto them a loving and faithful partner so long as we both shall live."\n\n{{partner}} repeats with names reversed. They sit. The meeting continues in silence.` },

  { key: "quaker_certificate", tradition: "quaker", kind: "ritual", reader: "Couple + meeting",
    title: "Signing of the Quaker certificate",
    description: "Couple signs the marriage certificate; everyone present signs as witnesses.",
    body: `The certificate of marriage, often a hand-calligraphed document, is brought forward and signed first by {{organizer}} and {{partner}}. After the meeting closes, every person present is invited to sign as a witness. The meeting itself is the witness.` },

  { key: "quaker_silence_close", tradition: "quaker", kind: "pronouncement", reader: "Clerk of meeting",
    title: "Closing of the meeting",
    description: "After more silence, the meeting closes by handshake.",
    body: `The meeting continues in silence, with anyone moved to speak rising to do so briefly. After perhaps an hour, an elder rises and shakes hands with their neighbor. The meeting closes; the marriage is sealed.` },
];

// ---- Celtic / Hand-fasting (commonly used in blends) -------------------

const CELTIC: RitualTemplate[] = [
  { key: "handfasting_binding", tradition: "celtic_handfasting", kind: "ritual", reader: "Officiant + couple",
    title: "Hand-fasting (binding of the hands)",
    description: "Couple's hands are bound with cord. origin of 'tying the knot.' Adopted across many secular and pagan traditions.",
    body: `{{organizer}} and {{partner}}, please join your hands.\n\n[Officiant binds the couple's hands with one or several cords, reciting promises with each cord:]\n\nThese are the hands that will hold yours through every season.\nThese are the hands that will tend to you in sickness, lift you in joy, and steady you in grief.\nThese are the hands that will build a home with you and welcome strangers in.\n\nMay your love always be as enduring as the knot you have tied today.`,
    commonInBlends: true },
];

// ---- Interfaith helpers (rituals commonly used to bridge traditions) ---

const INTERFAITH: RitualTemplate[] = [
  { key: "interfaith_dual_welcome", tradition: "interfaith", kind: "welcome", reader: "Two officiants",
    title: "Dual welcome",
    description: "Both officiants greet the assembly together; names the blend explicitly.",
    body: `[First officiant]\n\nFamily and friends, we welcome you to a ceremony that draws from two traditions and weaves them into one. Today we will hear from each tradition, and we will witness {{organizer}} and {{partner}} create a marriage that honors them both.\n\n[Second officiant]\n\nThe couple has chosen specific rituals from each of their backgrounds, and one or two new ones that belong to no tradition but their own. Whether or not you share their faiths, you are part of this celebration.` },

  { key: "interfaith_unity_ritual", tradition: "interfaith", kind: "ritual", reader: "Couple",
    title: "Unity ritual (sand / candle / wine)",
    description: "Tradition-neutral unity ritual. pour two colors of sand into one vessel, light a unity candle from two flames, or share wine from one cup.",
    body: `{{organizer}} and {{partner}}, your families brought you here separately. Today you become one family.\n\n[Unity sand: each pours their colored sand into a single vessel. the layers can never be separated again.]\n[Unity candle: each lights a smaller candle from their family's, then together light a larger candle, joining their flames.]\n[Shared cup: each drinks from a single cup of wine. a tradition shared across many cultures.]` },
];

// ---- Universal readings (any tradition) --------------------------------

const READINGS: RitualTemplate[] = [
  { key: "reading_corinthians", tradition: "humanist", kind: "reading",
    title: "1 Corinthians 13:4-8 (Love is patient)", reader: "Designated reader",
    description: "Common across Christian and secular ceremonies.",
    body: `Love is patient, love is kind. It does not envy, it does not boast, it is not proud.\n\nIt does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.\n\nLove does not delight in evil but rejoices with the truth.\n\nIt always protects, always trusts, always hopes, always perseveres.\n\nLove never fails.` },

  { key: "reading_oliver_wild_geese", tradition: "humanist", kind: "reading",
    title: "Wild Geese. Mary Oliver", reader: "Designated reader",
    description: "Secular favorite. Generous, open-handed.",
    body: `You do not have to be good.\nYou do not have to walk on your knees\nfor a hundred miles through the desert, repenting.\nYou only have to let the soft animal of your body\nlove what it loves.\n\nTell me about despair, yours, and I will tell you mine.\nMeanwhile the world goes on.\nMeanwhile the sun and the clear pebbles of the rain\nare moving across the landscapes,\nover the prairies and the deep trees,\nthe mountains and the rivers.\n\nMeanwhile the wild geese, high in the clean blue air,\nare heading home again.\n\nWhoever you are, no matter how lonely,\nthe world offers itself to your imagination,\ncalls to you like the wild geese, harsh and exciting , \nover and over announcing your place\nin the family of things.` },

  { key: "reading_apache_blessing", tradition: "humanist", kind: "blessing",
    title: "Apache Wedding Blessing", reader: "Designated reader",
    description: "Frequently read; widely beloved (note: not a literal Apache prayer. popularized by a 1947 novel. but cherished anyway).",
    body: `Now you will feel no rain, for each of you will be shelter to the other.\n\nNow you will feel no cold, for each of you will be warmth to the other.\n\nNow there is no more loneliness, for each of you will be companion to the other.\n\nNow you are two persons, but there is one life before you.\n\nGo now to your dwelling place, to enter into the days of your togetherness.\n\nAnd may your days be good and long upon the earth.` },

  { key: "reading_kahlil_gibran", tradition: "humanist", kind: "reading",
    title: "On Marriage. Kahlil Gibran", reader: "Designated reader",
    description: "Excerpt from The Prophet.",
    body: `You were born together, and together you shall be forevermore.\n\nYou shall be together when the white wings of death scatter your days.\n\nAye, you shall be together even in the silent memory of God.\n\nBut let there be spaces in your togetherness,\nAnd let the winds of the heavens dance between you.\n\nLove one another, but make not a bond of love:\nLet it rather be a moving sea between the shores of your souls.\n\nFill each other's cup but drink not from one cup.\nGive one another of your bread but eat not from the same loaf.\n\nSing and dance together and be joyous, but let each one of you be alone,\nEven as the strings of a lute are alone though they quiver with the same music.` },
];

export const RITUAL_LIBRARY: RitualTemplate[] = [
  ...HUMANIST, ...CIVIL, ...CATHOLIC, ...PROTESTANT, ...ORTHODOX,
  ...JEWISH, ...HINDU, ...MUSLIM, ...BUDDHIST, ...SIKH, ...QUAKER,
  ...CELTIC, ...INTERFAITH, ...READINGS,
];

// Substitute couple names into a template body.
export function substituteNames(body: string, organizerName: string, partnerName: string): string {
  return body
    .replace(/\{\{organizer\}\}/g, organizerName)
    .replace(/\{\{partner\}\}/g, partnerName);
}

// "Default ceremony" for a tradition. what we drop in when the user
// picks a tradition and clicks "Generate base ceremony" without going through
// Cleric.
export const DEFAULT_CEREMONIES: Record<CeremonyTradition, string[]> = {
  humanist:        ["humanist_welcome", "reading_oliver_wild_geese", "humanist_intentions", "humanist_pronouncement"],
  civil:           ["civil_authority", "civil_declaration", "civil_pronouncement"],
  catholic:        ["catholic_sign_of_cross", "catholic_liturgy_word", "catholic_consent", "catholic_blessing_of_rings", "catholic_nuptial_blessing", "catholic_dismissal"],
  protestant:      ["protestant_invocation", "protestant_charge", "reading_corinthians", "protestant_consent", "protestant_pronouncement"],
  orthodox_christian: ["orthodox_betrothal", "orthodox_crowning", "orthodox_common_cup", "orthodox_dance_of_isaiah"],
  jewish:          ["jewish_bedeken", "jewish_chuppah", "jewish_circling", "jewish_birkat_erusin", "jewish_ketubah_reading", "jewish_ring_harei_at", "jewish_sheva_brachot", "jewish_breaking_glass", "jewish_yichud"],
  hindu:           ["hindu_baraat", "hindu_var_mala", "hindu_kanyadaan", "hindu_mangal_pheras", "hindu_saptapadi", "hindu_sindoor_mangalsutra", "hindu_ashirvad"],
  muslim:          ["muslim_khutbah", "muslim_mahr", "muslim_ijab_qubul", "muslim_signing", "muslim_dua"],
  buddhist:        ["buddhist_three_refuges", "buddhist_offerings", "buddhist_metta_vows", "buddhist_bell"],
  sikh:            ["sikh_ardas", "sikh_palla", "sikh_lavan", "sikh_kara_prashad"],
  quaker:          ["quaker_silence_open", "quaker_promise", "quaker_certificate", "quaker_silence_close"],
  celtic_handfasting: ["humanist_welcome", "handfasting_binding", "humanist_intentions", "humanist_pronouncement"],
  interfaith:      ["interfaith_dual_welcome", "humanist_intentions", "interfaith_unity_ritual", "humanist_pronouncement"],
  custom:          [],
};

export function getRitual(key: string): RitualTemplate | undefined {
  return RITUAL_LIBRARY.find((r) => r.key === key);
}
