"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Shift = "" | "V" | "X";

type Exercise = {
  label: string;
  isMultiShift?: boolean;
  // single -> Shift; multi -> [Shift, Shift, Shift]
  value: Shift | [Shift, Shift, Shift];
};

type Company = {
  name: string;
  exercises: Exercise[];
};

function formatToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateHebrew(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

const INITIAL_COMPANIES: Company[] = [
  {
    name: "קידום",
    exercises: [
      { label: "סיור 35 עם תצפית", isMultiShift: true, value: ["", "", ""] },
      { label: "בולם 24", value: "" },
      { label: "חפק", value: "" },
      { label: "תרגיל ס/מפ", value: "" },
    ],
  },
  {
    name: "עשיר",
    exercises: [
      { label: "סיור 47 עם תצפית", isMultiShift: true, value: ["", "", ""] },
      { label: "בולם 50", value: "" },
      { label: "חפק", value: "" },
      { label: "תרגיל ס/מפ", value: "" },
    ],
  },
  {
    name: "יתרות",
    exercises: [
      { label: "סיור 44 עם תצפית", isMultiShift: true, value: ["", "", ""] },
      { label: "חפק", value: "" },
      { label: "תרגיל ס/מפ", value: "" },
    ],
  },
  {
    name: "שיכור",
    exercises: [
      { label: "סיור 41 עם תצפית", isMultiShift: true, value: ["", "", ""] },
      { label: "חפק", value: "" },
      { label: "תרגיל ס/מפ", value: "" },
    ],
  },
];

function iconFor(v: Shift): string {
  if (v === "V") return "✅";
  if (v === "X") return "❌";
  return "";
}

export default function WhatsappClient() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [date, setDate] = useState<string>(formatToday());
  const [companies, setCompanies] = useState<Company[]>(() =>
    // deep clone the initial data so we never mutate the module-level constant
    INITIAL_COMPANIES.map((c) => ({
      name: c.name,
      exercises: c.exercises.map((e) =>
        e.isMultiShift
          ? { ...e, value: [...(e.value as [Shift, Shift, Shift])] as [Shift, Shift, Shift] }
          : { ...e, value: e.value as Shift },
      ),
    })),
  );

  function setSingleValue(companyIdx: number, exerciseIdx: number, value: Shift) {
    setCompanies((prev) =>
      prev.map((company, ci) => {
        if (ci !== companyIdx) return company;
        return {
          ...company,
          exercises: company.exercises.map((ex, ei) =>
            ei === exerciseIdx ? { ...ex, value } : ex,
          ),
        };
      }),
    );
  }

  function setMultiShiftValue(
    companyIdx: number,
    exerciseIdx: number,
    shiftIdx: number,
    value: Shift,
  ) {
    setCompanies((prev) =>
      prev.map((company, ci) => {
        if (ci !== companyIdx) return company;
        return {
          ...company,
          exercises: company.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx || !Array.isArray(ex.value)) return ex;
            const next = [...ex.value] as [Shift, Shift, Shift];
            next[shiftIdx] = value;
            return { ...ex, value: next };
          }),
        };
      }),
    );
  }

  const generatedMessage = useMemo(() => {
    const dateStr = date ? formatDateHebrew(date) : "";
    let msg = `*מעקב תרגולות מבצעיות יומי - ${dateStr}*\n\n`;
    for (const company of companies) {
      msg += `*${company.name}*\n`;
      for (const exercise of company.exercises) {
        if (exercise.isMultiShift && Array.isArray(exercise.value)) {
          const icons = exercise.value.map((v) => iconFor(v)).join("|");
          msg += `${exercise.label} - ${icons}\n`;
        } else {
          msg += `${exercise.label} - ${iconFor(exercise.value as Shift)}\n`;
        }
      }
      msg += `\n`;
    }
    return msg.trim();
  }, [date, companies]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      toast.success("ההודעה הועתקה");
    } catch {
      toast.error("העתקה נכשלה");
    }
  }

  function exportToWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, "_blank");
  }

  // shared round toggle button
  function ToggleButton({
    active,
    variant,
    onClick,
    children,
  }: {
    active: boolean;
    variant: "v" | "x";
    onClick: () => void;
    children: React.ReactNode;
  }) {
    const base =
      "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg shadow-sm transition-colors cursor-pointer";
    let style: React.CSSProperties = { background: "#f3f4f6", borderColor: "transparent" };
    if (active && variant === "v") {
      style = { background: "#d1f5e1", borderColor: "#43a047" };
    } else if (active && variant === "x") {
      style = { background: "#ffe0e0", borderColor: "#e53935" };
    }
    return (
      <button type="button" className={base} style={style} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl py-6">
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setIsCollapsed((c) => !c)}
          className="flex w-full items-center justify-between border-b px-4 py-4 text-lg font-bold select-none"
        >
          <span>מעקב תרגולות יומי</span>
          <span className="text-2xl text-blue-500">{isCollapsed ? "+" : "-"}</span>
        </button>

        {!isCollapsed && (
          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-date">תאריך:</Label>
              <Input
                id="wa-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ direction: "ltr" }}
                className="w-fit"
              />
            </div>

            {companies.map((company, ci) => (
              <div key={company.name} className="space-y-2">
                <h3 className="text-base font-bold">{company.name}</h3>
                {company.exercises.map((exercise, ei) => (
                  <div
                    key={exercise.label}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <span className="min-w-[9rem]">{exercise.label}</span>
                    {exercise.isMultiShift && Array.isArray(exercise.value) ? (
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => {
                          const v = (exercise.value as [Shift, Shift, Shift])[i];
                          return (
                            <span key={i} className="flex items-center gap-1">
                              <ToggleButton
                                active={v === "V"}
                                variant="v"
                                onClick={() => setMultiShiftValue(ci, ei, i, "V")}
                              >
                                ✅
                              </ToggleButton>
                              <ToggleButton
                                active={v === "X"}
                                variant="x"
                                onClick={() => setMultiShiftValue(ci, ei, i, "X")}
                              >
                                ❌
                              </ToggleButton>
                              {i < 2 && (
                                <span className="mx-1 font-bold text-gray-400">
                                  |
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <ToggleButton
                          active={exercise.value === "V"}
                          variant="v"
                          onClick={() => setSingleValue(ci, ei, "V")}
                        >
                          ✅
                        </ToggleButton>
                        <ToggleButton
                          active={exercise.value === "X"}
                          variant="x"
                          onClick={() => setSingleValue(ci, ei, "X")}
                        >
                          ❌
                        </ToggleButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="wa-output">הודעה שנוצרה:</Label>
              <Textarea
                id="wa-output"
                readOnly
                rows={15}
                value={generatedMessage}
                dir="rtl"
                className="w-full text-base"
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={copyMessage}>
                  📋 העתק
                </Button>
                <Button
                  type="button"
                  onClick={exportToWhatsApp}
                  className="bg-[#25d366] text-white hover:bg-[#128c7e]"
                >
                  🟢 שלח לוואטסאפ
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
