"use client";

import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchDataHelper } from "@/lib/data-helpers";
import {
  VEHICLE_STATUSES,
  VEHICLE_COMPANIES,
  STATUS_HE,
  COMPANY_HE,
  SOURCE_HE,
  COMPANY_ORDER,
  COMPANY_LOCATION_HE,
  type VehicleStatus,
  type VehicleCompany,
  type VehicleSource,
} from "@/lib/constants";
import { isDateNear } from "@/lib/utils/format";
import type {
  VehicleRow,
  VehicleInsert,
  VehicleUpdate,
  DataHelperItem,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/loading-skeletons";
import { VehicleModal } from "@/components/vehicles/vehicle-modal";
import { VehiclesTable } from "@/components/vehicles/vehicles-table";
import { VehicleMobileCards } from "@/components/vehicles/vehicle-mobile-cards";

// ------------------------------------------------------------------
// Shared lookup helpers (exported for table / mobile components)
// ------------------------------------------------------------------

export function makeLookup(items: DataHelperItem[]) {
  const map = new Map(items.map((i) => [i.value, i.translation_he]));
  return (value?: string | null): string => {
    if (!value) return "";
    return map.get(value) ?? value;
  };
}

// Field accessor mirroring the original getFieldValue.
export function getFieldValue(v: VehicleRow, field: string): unknown {
  return (v as unknown as Record<string, unknown>)[field];
}

const DATE_FIELDS = new Set([
  "km_last_update_at",
  "updated_at",
  "next_treatment_date",
  "back_from_garage",
  "license_expiration",
  "orea_last_fill",
]);

export type SortDirection = "asc" | "desc";

export function compareValues(
  aVal: unknown,
  bVal: unknown,
  field: string,
  direction: SortDirection,
): number {
  if (aVal == null) return 1;
  if (bVal == null) return -1;
  if (DATE_FIELDS.has(field)) {
    const cmp =
      new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
    return direction === "asc" ? cmp : -cmp;
  }
  if (typeof aVal === "number" && typeof bVal === "number") {
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  }
  const cmp = String(aVal).localeCompare(String(bVal), "he");
  return direction === "asc" ? cmp : -cmp;
}

// ------------------------------------------------------------------
// Data layer (browser supabase + react-query)
// ------------------------------------------------------------------

const VEHICLES_KEY = ["vehicles"] as const;

async function fetchVehicles(): Promise<VehicleRow[]> {
  const { data, error } = await createClient()
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------
// Inner component (assumes QueryClientProvider above)
// ------------------------------------------------------------------

function VehiclesInner() {
  const queryClient = useQueryClient();

  const vehiclesQuery = useQuery({
    queryKey: VEHICLES_KEY,
    queryFn: fetchVehicles,
  });

  const modelsQuery = useQuery({
    queryKey: ["data_helpers", "vehicle_models"],
    queryFn: () => fetchDataHelper("vehicle_models"),
  });

  const usagesQuery = useQuery({
    queryKey: ["data_helpers", "vehicle_usages"],
    queryFn: () => fetchDataHelper("vehicle_usages"),
  });

  const models = useMemo(() => modelsQuery.data ?? [], [modelsQuery.data]);
  const usages = useMemo(() => usagesQuery.data ?? [], [usagesQuery.data]);
  const vehicles = useMemo(
    () => vehiclesQuery.data ?? [],
    [vehiclesQuery.data],
  );

  const getModelHe = useMemo(() => makeLookup(models), [models]);
  const getUsageHe = useMemo(() => makeLookup(usages), [usages]);

  // ---- Filters / sort state ----
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterUsage, setFilterUsage] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // ---- Modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(
    null,
  );

  // ---- Mutations ----
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: VehicleUpdate;
    }) => {
      const { error } = await createClient()
        .from("vehicles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: VEHICLES_KEY });
      const previous =
        queryClient.getQueryData<VehicleRow[]>(VEHICLES_KEY);
      queryClient.setQueryData<VehicleRow[]>(VEHICLES_KEY, (old) =>
        (old ?? []).map((v) => (v.id === id ? { ...v, ...updates } : v)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(VEHICLES_KEY, ctx.previous);
      toast.error("שמירת השינוי נכשלה");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (payload: VehicleInsert) => {
      const { error } = await createClient()
        .from("vehicles")
        .insert([payload]);
      if (error) throw error;
    },
    onError: () => toast.error("הוספת הרכב נכשלה"),
    onSuccess: () => toast.success("הרכב נוסף"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });

  const updateFullMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: VehicleUpdate;
    }) => {
      const { error } = await createClient()
        .from("vehicles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("עדכון הרכב נכשל"),
    onSuccess: () => toast.success("הרכב עודכן"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient()
        .from("vehicles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: VEHICLES_KEY });
      const previous =
        queryClient.getQueryData<VehicleRow[]>(VEHICLES_KEY);
      queryClient.setQueryData<VehicleRow[]>(VEHICLES_KEY, (old) =>
        (old ?? []).filter((v) => v.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(VEHICLES_KEY, ctx.previous);
      toast.error("מחיקת הרכב נכשלה");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });

  // ---- Filtered + sorted list ----
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.vehicle_number?.toLowerCase().includes(term) ||
          v.notes?.toLowerCase().includes(term),
      );
    }
    if (filterModel) result = result.filter((v) => v.model === filterModel);
    if (filterUsage) result = result.filter((v) => v.usage === filterUsage);
    if (filterCompany)
      result = result.filter((v) => v.at_company === filterCompany);
    if (filterStatus)
      result = result.filter((v) => v.status === filterStatus);

    if (sortField) {
      result.sort((a, b) =>
        compareValues(
          getFieldValue(a, sortField),
          getFieldValue(b, sortField),
          sortField,
          sortDirection,
        ),
      );
    } else {
      result.sort(
        (a, b) =>
          (COMPANY_ORDER[a.at_company as VehicleCompany] ?? 99) -
          (COMPANY_ORDER[b.at_company as VehicleCompany] ?? 99),
      );
    }
    return result;
  }, [
    vehicles,
    searchTerm,
    filterModel,
    filterUsage,
    filterCompany,
    filterStatus,
    sortField,
    sortDirection,
  ]);

  // grouping (company separators only when not sorting)
  const isCompanySeparator = (index: number): boolean => {
    if (sortField) return false;
    if (index === 0) return true;
    return (
      filteredVehicles[index].at_company !==
      filteredVehicles[index - 1].at_company
    );
  };

  // ---- Handlers ----
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleInlineSave = (id: string, field: string, value: unknown) => {
    updateMutation.mutate({ id, updates: { [field]: value } as VehicleUpdate });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterModel("");
    setFilterUsage("");
    setFilterCompany("");
    setFilterStatus("");
  };

  const openAddModal = () => {
    setSelectedVehicle(null);
    setModalOpen(true);
  };

  const openEditModal = (v: VehicleRow) => {
    setSelectedVehicle(v);
    setModalOpen(true);
  };

  const handleDelete = (v: VehicleRow) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק רכב זה?")) {
      deleteMutation.mutate(v.id);
    }
  };

  const handleSave = (data: VehicleInsert & { id?: string }) => {
    const { id, ...rest } = data;
    if (id) {
      updateFullMutation.mutate({ id, updates: rest });
    } else {
      insertMutation.mutate(rest);
    }
    setModalOpen(false);
    setSelectedVehicle(null);
  };

  // ---- Reports / exports ----
  const generateReport = (): string => {
    const grouped: Record<string, VehicleRow[]> = {};
    for (const v of vehicles) {
      (grouped[v.at_company] ||= []).push(v);
    }

    let report = "*דוח כשירות רכב קווי*\n\n";

    for (const company of [...VEHICLE_COMPANIES].sort(
      (a, b) => COMPANY_ORDER[a] - COMPANY_ORDER[b],
    )) {
      const list = grouped[company];
      if (!list || list.length === 0) continue;
      const locationHe = COMPANY_LOCATION_HE[company] || COMPANY_HE[company];
      report += `*${COMPANY_HE[company]} (${locationHe})*\n`;
      for (const v of list) {
        const icon = v.status === "active" ? "✅" : "❌";
        const modelHe = getModelHe(v.model);
        const usageHe = getUsageHe(v.usage);
        report += `[${icon}] ${modelHe} ${usageHe} ${v.vehicle_number}`;
        if (v.license_expiration && isDateNear(v.license_expiration)) {
          const d = new Date(v.license_expiration);
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          report += ` ⚠️ רישיון יפוג ב-${dd}/${mm}/${yyyy}`;
        }
        if (v.problem_desc) {
          report += ` *${v.problem_desc}*`;
        }
        report += "\n";
      }
      report += "\n";
    }
    return report;
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(generateReport());
      toast.success("הדוח הועתק");
    } catch {
      toast.error("העתקת הדוח נכשלה");
    }
  };

  const exportToWhatsApp = () => {
    const report = generateReport();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(report)}`,
      "_blank",
    );
  };

  const exportToCSV = () => {
    const headers = [
      "פלוגה",
      "מקור",
      "תפקיד",
      "מספר רכב",
      "סוג",
      "סטטוס",
      'ק"מ',
      "טיפול הבא",
      "הערות",
    ];
    const rows = vehicles.map((v) => [
      COMPANY_HE[v.at_company as VehicleCompany] || "",
      v.source ? SOURCE_HE[v.source as VehicleSource] || "" : "",
      getUsageHe(v.usage),
      v.vehicle_number || "",
      getModelHe(v.model),
      STATUS_HE[v.status as VehicleStatus] || "",
      v.km != null ? String(v.km) : "",
      v.next_treatment || "",
      v.notes || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().split("T")[0];
    a.download = `רכבים_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Render ----
  if (vehiclesQuery.isLoading) {
    return <TableSkeleton />;
  }

  if (vehiclesQuery.isError) {
    return (
      <div className="p-4 text-destructive">טעינת הרכבים נכשלה</div>
    );
  }

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header: filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש לפי מספר רכב או הערות..."
            className="w-56"
          />

          <Select
            value={filterModel || "__all__"}
            onValueChange={(v) =>
              setFilterModel(!v || v === "__all__" ? "" : v)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="כל הסוגים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">כל הסוגים</SelectItem>
              {models.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.translation_he}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterUsage || "__all__"}
            onValueChange={(v) =>
              setFilterUsage(!v || v === "__all__" ? "" : v)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="כל התפקידים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">כל התפקידים</SelectItem>
              {usages.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.translation_he}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterCompany || "__all__"}
            onValueChange={(v) =>
              setFilterCompany(!v || v === "__all__" ? "" : v)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="כל הפלוגות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">כל הפלוגות</SelectItem>
              {VEHICLE_COMPANIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {COMPANY_HE[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus || "__all__"}
            onValueChange={(v) =>
              setFilterStatus(!v || v === "__all__" ? "" : v)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="כל הסטטוסים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">כל הסטטוסים</SelectItem>
              {VEHICLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_HE[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters}>
            נקה סינון
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={copyReport}>
            העתק דוח
          </Button>
          <Button
            className="bg-[#25d366] text-white hover:bg-[#1ebe5b]"
            onClick={exportToWhatsApp}
          >
            שלח לוואטסאפ
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            ייצוא לאקסל
          </Button>
          <Button onClick={openAddModal}>הוסף רכב</Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <VehiclesTable
          vehicles={filteredVehicles}
          getModelHe={getModelHe}
          getUsageHe={getUsageHe}
          sortField={sortField}
          onSort={handleSort}
          onInlineSave={handleInlineSave}
          isCompanySeparator={isCompanySeparator}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        <VehicleMobileCards
          vehicles={filteredVehicles}
          getModelHe={getModelHe}
          getUsageHe={getUsageHe}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </div>

      <VehicleModal
        open={modalOpen}
        vehicle={selectedVehicle}
        models={models}
        usages={usages}
        onClose={() => {
          setModalOpen(false);
          setSelectedVehicle(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Public component — self-contained QueryClientProvider so the tab
// works even if the global provider is not wired up.
// ------------------------------------------------------------------

export function VehiclesClient() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <VehiclesInner />
    </QueryClientProvider>
  );
}
