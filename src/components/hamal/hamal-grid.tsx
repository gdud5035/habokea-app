"use client";

import { cn } from "@/lib/utils";
import { WEEKDAY_HE } from "@/lib/constants";
import { dateKey, type Slot } from "@/lib/utils/week";
import type { HamalAssignmentRow } from "@/types/database";

export interface HamalGridProps {
  days: Date[];
  slots: Slot[];
  /** key = `${dateKey}|${slot.startHour}` → assignments in that cell. */
  assignmentsByCell: Map<string, HamalAssignmentRow[]>;
  nameById: Map<string, string>;
  todayKey: string;
  onCellClick: (date: Date, slot: Slot) => void;
}

function cellKey(dk: string, startHour: number): string {
  return `${dk}|${startHour}`;
}

export function HamalGrid({
  days,
  slots,
  assignmentsByCell,
  nameById,
  todayKey,
  onCellClick,
}: HamalGridProps) {
  return (
    <div className="overflow-x-auto rounded-md border" dir="rtl">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky right-0 z-10 w-24 border-b border-l bg-muted/50 p-2 text-xs font-medium text-muted-foreground">
              שעות
            </th>
            {days.map((d) => {
              const isToday = dateKey(d) === todayKey;
              return (
                <th
                  key={dateKey(d)}
                  className={cn(
                    "border-b border-l p-2 text-center font-medium last:border-l-0",
                    isToday ? "bg-primary/10 text-primary" : "bg-muted/50",
                  )}
                >
                  <div>{WEEKDAY_HE[d.getDay()]}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {d.getDate().toString().padStart(2, "0")}/
                    {(d.getMonth() + 1).toString().padStart(2, "0")}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.startHour}>
              <th className="sticky right-0 z-10 border-b border-l bg-muted/30 p-2 text-center text-xs font-medium whitespace-nowrap text-muted-foreground">
                {slot.label}
              </th>
              {days.map((d) => {
                const dk = dateKey(d);
                const isToday = dk === todayKey;
                const rows = assignmentsByCell.get(cellKey(dk, slot.startHour)) ?? [];
                const full = rows.length >= 2;
                return (
                  <td
                    key={dk}
                    className={cn(
                      "border-b border-l p-1 align-top last:border-l-0",
                      isToday && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onCellClick(d, slot)}
                      className={cn(
                        "flex h-full min-h-14 w-full flex-col gap-1 rounded-md p-1.5 text-right transition-colors",
                        rows.length === 0
                          ? "text-muted-foreground/60 hover:bg-accent"
                          : "hover:bg-accent",
                      )}
                    >
                      {rows.length === 0 ? (
                        <span className="text-xs">+ שיבוץ</span>
                      ) : (
                        <>
                          {rows.map((a) => (
                            <span
                              key={a.id}
                              className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                            >
                              {nameById.get(a.sambatz_id) ?? "—"}
                            </span>
                          ))}
                          {!full && (
                            <span className="text-xs text-muted-foreground/60">
                              + הוסף
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
