// Domain constants for the Habokea (גדוד הבוקע 5035) app.
// Ported from the original Angular app's vehicle.model.ts + translation maps.

export const APP_NAME = "גדוד הבוקע - 5035";

// ---- Tabs / permissions ----
export const TAB_KEYS = ["vehicles", "drive_card", "whatsapp", "admin", "profile"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const TAB_LABELS: Record<TabKey, string> = {
  vehicles: "רכבים",
  drive_card: "כרטיס עבודה",
  whatsapp: "הודעות וואטסאפ",
  admin: "ניהול",
  profile: "פרופיל",
};

export const TAB_ROUTES: Record<TabKey, string> = {
  vehicles: "/vehicles",
  drive_card: "/drive-card",
  whatsapp: "/whatsapp",
  admin: "/admin",
  profile: "/profile",
};

// Profile is always accessible to any authenticated user.
export const ALWAYS_ALLOWED_TABS: TabKey[] = ["profile"];

// ---- Vehicle enums ----
export const VEHICLE_STATUSES = ["active", "garage", "disabled"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_COMPANIES = ["A", "B", "C", "Mesayat", "Palsam", "Mafgad"] as const;
export type VehicleCompany = (typeof VEHICLE_COMPANIES)[number];

export const VEHICLE_SOURCES = ["yaram", "kavi", "yamah"] as const;
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
