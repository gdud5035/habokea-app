// Domain constants for the Habokea (גדוד הבוקע 5035) app.
// Ported from the original Angular app's vehicle.model.ts + translation maps.

export const APP_NAME = "גדוד הבוקע - 5035";

// ---- Tabs / permissions ----
export const TAB_KEYS = ["vehicles", "drones", "hamal", "drive_card", "tzalam", "whatsapp", "admin", "profile"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const TAB_LABELS: Record<TabKey, string> = {
  vehicles: "רכבים",
  drones: "רחפנים",
  hamal: "שבצק חמל",
  drive_card: "כרטיס עבודה",
  tzalam: "צלם",
  whatsapp: "הודעות וואטסאפ",
  admin: "ניהול",
  profile: "פרופיל",
};

export const TAB_ROUTES: Record<TabKey, string> = {
  vehicles: "/vehicles",
  drones: "/drones",
  hamal: "/hamal",
  drive_card: "/drive-card",
  tzalam: "/tzalam",
  whatsapp: "/whatsapp",
  admin: "/admin",
  profile: "/profile",
};

// Profile is always accessible to any authenticated user.
export const ALWAYS_ALLOWED_TABS: TabKey[] = ["profile"];

// ---- "צלם" companies (a distinct list from the vehicle companies) ----
export const TZALAM_COMPANIES = ["A", "B", "C", "Mesayat", "Palsam", "Bunker"] as const;
export type TzalamCompany = (typeof TZALAM_COMPANIES)[number];

export const TZALAM_COMPANY_HE: Record<TzalamCompany, string> = {
  A: "פלוגה א",
  B: "פלוגה ב",
  C: "פלוגה ג",
  Mesayat: "פלוגה מסייעת",
  Palsam: 'פלס"מ',
  Bunker: "בונקר",
};

export const TZALAM_COMPANY_ORDER: Record<TzalamCompany, number> = {
  A: 1,
  B: 2,
  C: 3,
  Mesayat: 4,
  Palsam: 5,
  Bunker: 6,
};

// ---- Color palette for סמבצים (שבצק חמל) ----
export const HAMAL_COLORS: string[] = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#dc2626", // dark red
  "#b45309", // brown
  "#65a30d", // olive
  "#047857", // emerald
  "#0e7490", // dark cyan
  "#1d4ed8", // dark blue
  "#7c3aed", // violet
  "#9d174d", // maroon
  "#78716c", // stone
  "#475569", // slate
];

// ---- Hebrew weekday names (JS getDay(): 0 = Sunday … 6 = Saturday) ----
export const WEEKDAY_HE: Record<number, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת",
};

// ---- Vehicle enums ----
export const VEHICLE_STATUSES = ["active", "garage", "disabled"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_COMPANIES = ["A", "B", "C", "Mesayat", "Palsam", "Mafgad"] as const;
export type VehicleCompany = (typeof VEHICLE_COMPANIES)[number];

export const VEHICLE_SOURCES = ["yaram", "kavi", "yamah", "rented"] as const;
export type VehicleSource = (typeof VEHICLE_SOURCES)[number];

// ---- Hebrew label maps (from the original app) ----
export const STATUS_HE: Record<VehicleStatus, string> = {
  active: "תקין",
  garage: "במוסך",
  disabled: "מושבת",
};

export const COMPANY_HE: Record<VehicleCompany, string> = {
  A: "א",
  B: "ב",
  C: "ג",
  Mesayat: "מסייעת",
  Palsam: "פלסם",
  Mafgad: "מפגד",
};

export const SOURCE_HE: Record<VehicleSource, string> = {
  yaram: 'יר"ם',
  kavi: "קווי",
  yamah: 'ימ"ח',
  rented: "שכור",
};

// Default company sort order (Mafgad > A > B > C > Mesayat > Palsam).
export const COMPANY_ORDER: Record<VehicleCompany, number> = {
  Mafgad: 1,
  A: 2,
  B: 3,
  C: 4,
  Mesayat: 5,
  Palsam: 6,
};

// Company -> location, used by the WhatsApp report (from generateVehicleReport).
export const COMPANY_LOCATION_HE: Record<VehicleCompany, string> = {
  Mafgad: "יקיר",
  A: "קרנ״ש",
  B: "עלי זהב",
  C: "יקיר",
  Mesayat: "עמנואל",
  Palsam: "יקיר",
};

// ---- Seed data for data_helpers (models & usages, value + Hebrew) ----
export const SEED_VEHICLE_MODELS: { value: string; translation_he: string }[] = [
  { value: "david", translation_he: "דוד" },
  { value: "tigris", translation_he: "טיגריס" },
  { value: "triton", translation_he: "טרייטון" },
  { value: "hilux", translation_he: "היילקס" },
  { value: "ambulance", translation_he: "אמבולנס" },
  { value: "hammer", translation_he: "האמר" },
];

export const SEED_VEHICLE_USAGES: { value: string; translation_he: string }[] = [
  { value: "hapak", translation_he: 'חפ"ק' },
  { value: "sioor", translation_he: "סיור" },
  { value: "kk", translation_he: 'כ"כ' },
  { value: "minhala", translation_he: "מנהלה" },
];
