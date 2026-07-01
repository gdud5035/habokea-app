// Hand-authored DB types matching supabase/migrations.
// After the schema is applied, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VehicleRow = {
  id: string;
  vehicle_number: string;
  status: string;
  model: string;
  at_company: string;
  source: string | null;
  km: number | null;
  next_treatment: string | null;
  next_treatment_date: string | null;
  treatments_log: Json;
  usage: string | null;
  back_from_garage: string | null;
  notes: string | null;
  license_expiration: string | null;
  orea_last_fill: string | null;
  treatment_freq: number | null;
  problem_desc: string | null;
  no_orea: boolean | null;
  km_last_update_at: string | null;
  created_at: string;
  updated_at: string;
};
export type VehicleInsert = Omit<
  VehicleRow,
  "id" | "created_at" | "km_last_update_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  km_last_update_at?: string | null;
  updated_at?: string;
};
export type VehicleUpdate = Partial<VehicleInsert>;

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role_id: string | null;
  must_change_password: boolean;
  created_at: string;
};

export type RoleRow = { id: string; name: string; created_at: string };

export type RoleTabAccessRow = {
  id: string;
  role_id: string;
  tab_key: string;
  can_access: boolean;
};

export type UserTabOverrideRow = {
  id: string;
  user_id: string;
  tab_key: string;
  can_access: boolean | null;
};

export type DataHelperRow = {
  id: string;
  name: string;
  items: Json;
};

export type DriveCardRow = {
  id: string;
  vehicle_id: string;
  date: string;
  driver_id: string | null;
  start_km: number;
  end_km: number;
  from_location: string;
  to_location: string;
  purpose: string;
  approved_by: string;
  dispatcher_approval: string | null;
  signature: string;
  created_at: string;
};
export type DriveCardInsert = Omit<DriveCardRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type DroneRow = {
  id: string;
  name: string;
  at_company: string | null;
  signed_by: string | null;
  created_at: string;
};
export type DroneInsert = Omit<DroneRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
export type DroneUpdate = Partial<DroneInsert>;

export type AppSettingRow = {
  key: string;
  value: string;
  updated_at: string;
};
export type AppSettingInsert = Omit<AppSettingRow, "updated_at"> & {
  updated_at?: string;
};
export type AppSettingUpdate = Partial<AppSettingInsert>;

export type HamalSambatzRow = {
  id: string;
  full_name: string;
  color: string | null;
  created_at: string;
};
export type HamalSambatzInsert = Omit<HamalSambatzRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
export type HamalSambatzUpdate = Partial<HamalSambatzInsert>;

export type HamalAssignmentRow = {
  id: string;
  shift_date: string;
  slot_start_hour: number;
  sambatz_id: string;
  created_at: string;
};
export type HamalAssignmentInsert = Omit<
  HamalAssignmentRow,
  "id" | "created_at"
> & {
  id?: string;
  created_at?: string;
};
export type HamalAssignmentUpdate = Partial<HamalAssignmentInsert>;

export type HamalDayTextRow = {
  id: string;
  shift_date: string;
  kind: string; // 'note' | 'attack'
  content: string;
  updated_at: string;
};
export type HamalDayTextInsert = Omit<
  HamalDayTextRow,
  "id" | "updated_at"
> & {
  id?: string;
  updated_at?: string;
};
export type HamalDayTextUpdate = Partial<HamalDayTextInsert>;

type Table<R, I = Partial<R>, U = Partial<R>> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      vehicles: Table<VehicleRow, VehicleInsert, VehicleUpdate>;
      profiles: Table<ProfileRow>;
      roles: Table<RoleRow>;
      role_tab_access: Table<RoleTabAccessRow>;
      user_tab_overrides: Table<UserTabOverrideRow>;
      data_helpers: Table<DataHelperRow>;
      drive_cards: Table<DriveCardRow, DriveCardInsert>;
      push_subscriptions: Table<PushSubscriptionRow>;
      drones: Table<DroneRow, DroneInsert, DroneUpdate>;
      app_settings: Table<AppSettingRow, AppSettingInsert, AppSettingUpdate>;
      hamal_sambatzim: Table<
        HamalSambatzRow,
        HamalSambatzInsert,
        HamalSambatzUpdate
      >;
      hamal_assignments: Table<
        HamalAssignmentRow,
        HamalAssignmentInsert,
        HamalAssignmentUpdate
      >;
      hamal_day_text: Table<
        HamalDayTextRow,
        HamalDayTextInsert,
        HamalDayTextUpdate
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases for app code.
export type DataHelperItem = { value: string; translation_he: string };
