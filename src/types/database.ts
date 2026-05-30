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
};
export type VehicleInsert = Omit<VehicleRow, "id" | "created_at" | "km_last_update_at"> & {
  id?: string;
  created_at?: string;
  km_last_update_at?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases for app code.
export type DataHelperItem = { value: string; translation_he: string };
