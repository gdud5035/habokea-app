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
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COMPANY_HE, type VehicleCompany } from "@/lib/constants";
import type { DroneRow, DroneInsert, DroneUpdate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/loading-skeletons";
import { DroneModal } from "@/components/drones/drone-modal";

// ------------------------------------------------------------------
// Data layer (browser supabase + react-query)
// ------------------------------------------------------------------

const DRONES_KEY = ["drones"] as const;

async function fetchDrones(): Promise<DroneRow[]> {
  const { data, error } = await createClient()
    .from("drones")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function companyLabel(value: string | null): string {
  if (!value) return "—";
  return COMPANY_HE[value as VehicleCompany] ?? value;
}

// ------------------------------------------------------------------
// Inner component (assumes QueryClientProvider above)
// ------------------------------------------------------------------

function DronesInner() {
  const queryClient = useQueryClient();

  const dronesQuery = useQuery({
    queryKey: DRONES_KEY,
    queryFn: fetchDrones,
  });

  const drones = useMemo(() => dronesQuery.data ?? [], [dronesQuery.data]);

  // ---- Filter state ----
  const [searchTerm, setSearchTerm] = useState("");

  // ---- Modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState<DroneRow | null>(null);

  // ---- Mutations ----
  const insertMutation = useMutation({
    mutationFn: async (payload: DroneInsert) => {
      const { error } = await createClient().from("drones").insert([payload]);
      if (error) throw error;
    },
    onError: () => toast.error("הוספת הרחפן נכשלה"),
    onSuccess: () => toast.success("הרחפן נוסף"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DRONES_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: DroneUpdate;
    }) => {
      const { error } = await createClient()
        .from("drones")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: DRONES_KEY });
      const previous = queryClient.getQueryData<DroneRow[]>(DRONES_KEY);
      queryClient.setQueryData<DroneRow[]>(DRONES_KEY, (old) =>
        (old ?? []).map((d) => (d.id === id ? { ...d, ...updates } : d)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(DRONES_KEY, ctx.previous);
      toast.error("עדכון הרחפן נכשל");
    },
    onSuccess: () => toast.success("הרחפן עודכן"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DRONES_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient()
        .from("drones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: DRONES_KEY });
      const previous = queryClient.getQueryData<DroneRow[]>(DRONES_KEY);
      queryClient.setQueryData<DroneRow[]>(DRONES_KEY, (old) =>
        (old ?? []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(DRONES_KEY, ctx.previous);
      toast.error("מחיקת הרחפן נכשלה");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DRONES_KEY });
    },
  });

  // ---- Filtered list ----
  const filteredDrones = useMemo(() => {
    if (!searchTerm) return drones;
    const term = searchTerm.toLowerCase();
    return drones.filter((d) => d.name?.toLowerCase().includes(term));
  }, [drones, searchTerm]);

  // ---- Handlers ----
  const openAddModal = () => {
    setSelectedDrone(null);
    setModalOpen(true);
  };

  const openEditModal = (d: DroneRow) => {
    setSelectedDrone(d);
    setModalOpen(true);
  };

  const handleDelete = (d: DroneRow) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק רחפן זה?")) {
      deleteMutation.mutate(d.id);
    }
  };

  const handleSave = (data: DroneInsert & { id?: string }) => {
    const { id, ...rest } = data;
    if (id) {
      updateMutation.mutate({ id, updates: rest });
    } else {
      insertMutation.mutate(rest);
    }
    setModalOpen(false);
    setSelectedDrone(null);
  };

  // ---- Render ----
  if (dronesQuery.isLoading) {
    return <TableSkeleton />;
  }

  if (dronesQuery.isError) {
    return <div className="p-4 text-destructive">טעינת הרחפנים נכשלה</div>;
  }

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header: search + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חיפוש לפי שם..."
          className="w-56"
        />
        <Button onClick={openAddModal}>הוסף רחפן</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap text-right">שם</TableHead>
              <TableHead className="whitespace-nowrap text-right">
                פלוגה
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                חתום על ידי
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                פעולות
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredDrones.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">{d.name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {companyLabel(d.at_company)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.signed_by || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="ערוך"
                      onClick={() => openEditModal(d)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="מחק"
                      onClick={() => handleDelete(d)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filteredDrones.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  אין רחפנים
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DroneModal
        open={modalOpen}
        drone={selectedDrone}
        onClose={() => {
          setModalOpen(false);
          setSelectedDrone(null);
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

export function DronesClient() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <DronesInner />
    </QueryClientProvider>
  );
}
