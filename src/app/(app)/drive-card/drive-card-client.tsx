"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchDataHelper } from "@/lib/data-helpers";
import { formatDateHebrew, formatDateForInput } from "@/lib/utils/format";

const todayISO = () => formatDateForInput(new Date());
import type {
  DriveCardRow,
  DriveCardInsert,
  VehicleRow,
  ProfileRow,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const emptyForm = () => ({
  date: todayISO(),
  driver_id: "",
  purpose: "",
  from_location: "",
  to_location: "",
  start_km: "",
  end_km: "",
  approved_by: "",
  dispatcher_approval: "",
  signature: "",
});

export default function DriveCardClient() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // ---- vehicle models (translations) ----
  const { data: vehicleModelItems = [] } = useQuery({
    queryKey: ["data_helpers", "vehicle_models"],
    queryFn: () => fetchDataHelper("vehicle_models"),
    staleTime: 5 * 60 * 1000,
  });

  const vehicleModels = useMemo(() => {
    const map: Record<string, string> = {};
    vehicleModelItems.forEach((m) => {
      map[m.value] = m.translation_he;
    });
    return map;
  }, [vehicleModelItems]);

  // ---- vehicles ----
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async (): Promise<VehicleRow[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, vehicle_number, model, created_at");
      if (error) throw error;
      return (data as VehicleRow[]) || [];
    },
  });

  // ---- profiles (drivers) ----
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at");
      if (error) throw error;
      return (data as ProfileRow[]) || [];
    },
  });

  const profileName = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {
      map[p.id] = p.full_name || p.email || p.id;
    });
    return map;
  }, [profiles]);

  // sorted vehicles by Hebrew model name
  const sortedVehicles = useMemo(() => {
    const modelHe = (v: VehicleRow) => vehicleModels[v.model] || v.model;
    return [...vehicles].sort((a, b) =>
      modelHe(a).localeCompare(modelHe(b), "he")
    );
  }, [vehicles, vehicleModels]);

  // ---- entries for selected vehicle ----
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["drive_cards", selectedVehicleId],
    enabled: !!selectedVehicleId,
    queryFn: async (): Promise<DriveCardRow[]> => {
      const { data, error } = await supabase
        .from("drive_cards")
        .select("*")
        .eq("vehicle_id", selectedVehicleId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data as DriveCardRow[]) || [];
    },
  });

  const totalTrips = entries.length;
  const totalKm = entries.reduce(
    (sum, e) => sum + ((e.end_km || 0) - (e.start_km || 0)),
    0
  );

  const updateForm = (key: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!selectedVehicleId) return "יש לבחור רכב";
    if (!form.date) return "יש להזין תאריך";
    if (!form.driver_id) return "יש לבחור נהג";
    if (!form.purpose.trim()) return "יש להזין מטרת נסיעה";
    if (!form.from_location.trim()) return "יש להזין מהיכן";
    if (!form.to_location.trim()) return "יש להזין לאן";
    if (form.start_km === "" || Number(form.start_km) < 0)
      return 'יש להזין ק"מ יציאה תקין';
    if (form.end_km === "" || Number(form.end_km) < 0)
      return 'יש להזין ק"מ חזרה תקין';
    if (!form.approved_by.trim()) return "יש להזין אישור מפקד משימה";
    if (!form.signature.trim()) return "יש להזין חתימת נהג";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    const payload: DriveCardInsert = {
      vehicle_id: selectedVehicleId,
      date: form.date,
      driver_id: form.driver_id,
      start_km: Number(form.start_km),
      end_km: Number(form.end_km),
      from_location: form.from_location.trim(),
      to_location: form.to_location.trim(),
      purpose: form.purpose.trim(),
      approved_by: form.approved_by.trim(),
      dispatcher_approval: form.dispatcher_approval.trim() || null,
      signature: form.signature.trim(),
    };

    const queryKey = ["drive_cards", selectedVehicleId];
    const { data, error } = await supabase
      .from("drive_cards")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      toast.error("שגיאה בהוספת הנסיעה");
      setSubmitting(false);
      return;
    }

    // optimistic prepend
    queryClient.setQueryData<DriveCardRow[]>(queryKey, (old = []) => [
      data as DriveCardRow,
      ...old,
    ]);
    setForm(emptyForm());
    toast.success("הנסיעה נוספה בהצלחה");
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק נסיעה זו?")) return;
    const queryKey = ["drive_cards", selectedVehicleId];
    const { error } = await supabase.from("drive_cards").delete().eq("id", id);
    if (error) {
      toast.error("שגיאה במחיקת הנסיעה");
      return;
    }
    queryClient.setQueryData<DriveCardRow[]>(queryKey, (old = []) =>
      old.filter((e) => e.id !== id)
    );
    toast.success("הנסיעה נמחקה");
  };

  const handleExportPdf = () => {
    if (!selectedVehicleId) return;
    const url = `/api/drive-card/${selectedVehicleId}/pdf`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `drive_card_${selectedVehicleId}_${todayISO()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">כרטיס עבודה</h1>

      {/* Vehicle selector */}
      <Card>
        <CardHeader>
          <CardTitle>בחר רכב</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedVehicleId}
            onValueChange={(v) => setSelectedVehicleId(v ?? "")}
          >
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="בחר רכב" />
            </SelectTrigger>
            <SelectContent>
              {sortedVehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vehicle_number} - {vehicleModels[v.model] || v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedVehicleId && (
        <>
          {/* Add-trip form */}
          <Card>
            <CardHeader>
              <CardTitle>הוסף נסיעה חדשה</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="date">תאריך</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => updateForm("date", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="driver">נהג</Label>
                  <Select
                    value={form.driver_id}
                    onValueChange={(v) => updateForm("driver_id", v ?? "")}
                  >
                    <SelectTrigger id="driver" className="w-full">
                      <SelectValue placeholder="בחר נהג" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email || p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="purpose">מטרת הנסיעה</Label>
                  <Input
                    id="purpose"
                    value={form.purpose}
                    onChange={(e) => updateForm("purpose", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="from">מהיכן</Label>
                  <Input
                    id="from"
                    value={form.from_location}
                    onChange={(e) => updateForm("from_location", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="to">לאן</Label>
                  <Input
                    id="to"
                    value={form.to_location}
                    onChange={(e) => updateForm("to_location", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="start_km">ק&quot;מ יציאה</Label>
                  <Input
                    id="start_km"
                    type="number"
                    min={0}
                    value={form.start_km}
                    onChange={(e) => updateForm("start_km", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end_km">ק&quot;מ חזרה</Label>
                  <Input
                    id="end_km"
                    type="number"
                    min={0}
                    value={form.end_km}
                    onChange={(e) => updateForm("end_km", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="approved_by">אישור מפקד משימה (שם מלא)</Label>
                  <Input
                    id="approved_by"
                    value={form.approved_by}
                    onChange={(e) => updateForm("approved_by", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dispatcher_approval">
                    אישור מפקד משלח משימה (שם מלא)
                  </Label>
                  <Input
                    id="dispatcher_approval"
                    value={form.dispatcher_approval}
                    onChange={(e) =>
                      updateForm("dispatcher_approval", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signature">חתימת נהג</Label>
                  <Input
                    id="signature"
                    value={form.signature}
                    onChange={(e) => updateForm("signature", e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "מוסיף..." : "הוסף נסיעה"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Entries table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>רשימת נסיעות</CardTitle>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={entriesLoading}
              >
                {entries.length === 0 ? "ייצא PDF ריק" : "ייצא PDF"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">נהג</TableHead>
                      <TableHead className="text-right">מטרת הנסיעה</TableHead>
                      <TableHead className="text-right">מהיכן</TableHead>
                      <TableHead className="text-right">לאן</TableHead>
                      <TableHead className="text-right">ק&quot;מ יציאה</TableHead>
                      <TableHead className="text-right">ק&quot;מ חזרה</TableHead>
                      <TableHead className="text-right">אישור מפקד משימה</TableHead>
                      <TableHead className="text-right">
                        אישור מפקד משלח משימה
                      </TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">
                          טוען...
                        </TableCell>
                      </TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">
                          אין נסיעות לרכב זה
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{formatDateHebrew(e.date)}</TableCell>
                          <TableCell>
                            {(e.driver_id ? profileName[e.driver_id] : "") ||
                              e.driver_id ||
                              "-"}
                          </TableCell>
                          <TableCell>{e.purpose}</TableCell>
                          <TableCell>{e.from_location}</TableCell>
                          <TableCell>{e.to_location}</TableCell>
                          <TableCell>{e.start_km}</TableCell>
                          <TableCell>{e.end_km}</TableCell>
                          <TableCell>{e.approved_by}</TableCell>
                          <TableCell>{e.dispatcher_approval || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(e.id)}
                            >
                              מחק
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>סיכום</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>סה&quot;כ נסיעות: {totalTrips}</div>
              <Separator />
              <div>סה&quot;כ ק&quot;מ: {totalKm}</div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
