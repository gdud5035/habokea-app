"use client";

import { cn } from "@/lib/utils";
import { WEEKDAY_HE } from "@/lib/constants";
import { dateKey, textOn, type Slot } from "@/lib/utils/week";
import type { HamalAssignmentRow, HamalSambatzRow } from "@/types/database";

export interface HamalGridProps {
  days: Date[];
  slots: Slot[];
  /** key = `${dateKey}|${slot.startHour}` → assignments in that cell. */
  assignmentsByCell: Map<string, HamalAssignmentRow[]>;
  /** key = dateKey → home (בבית) assignments for that day. */
  homeByDate: Map<string, HamalAssignmentRow[]>;
  sambatzById: Map<string, HamalSambatzRow>;
  todayKey: string;
  onCellClick: (date: Date, slot: Slot) => void;
  onHomeClick: (date: Date) => void;
}

function cellKey(dk: string, startHour: number): string {
  return `${dk}|${startHour}`;
}

function NameChip({ s }: { s: HamalSambatzRow | undefined }) {
  const color = s?.color ?? null;
  return (
    <span
      className={cn(
        "truncate rounded px-1.5 py-0.5 text-xs",
        !color && "bg-primary/10 text-primary",
      )}
      style={color ? { backgroundColor: color, color: textOn(color) } : undefined}
    >
      {s?.full_name ?? "—"}
    </span>
  );
}

export function HamalGrid({
  days,
  slots,
  assignmentsByCell,
  homeByDate,
  sambatzById,
  todayKey,
  onCellClick,
  onHomeClick,
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
                const rows =
                  assignmentsByCell.get(cellKey(dk, slot.startHour)) ?? [];
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
                        "flex h-full min-h-14 w-full cursor-pointer flex-col gap-1 rounded-md p-1.5 text-right transition-colors",
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
                            <NameChip
                              key={a.id}
                              s={sambatzById.get(a.sambatz_id)}
                            />
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

          {/* בבית row */}
          <tr>
            <th className="sticky right-0 z-10 border-l bg-muted/30 p-2 text-center text-xs font-medium whitespace-nowrap text-muted-foreground">
              בבית
            </th>
            {days.map((d) => {
              const dk = dateKey(d);
              const isToday = dk === todayKey;
              const rows = homeByDate.get(dk) ?? [];
              return (
                <td
                  key={dk}
                  className={cn(
                    "border-l p-1 align-top last:border-l-0",
                    isToday && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onHomeClick(d)}
                    className={cn(
                      "flex h-full min-h-12 w-full cursor-pointer flex-wrap gap-1 rounded-md p-1.5 text-right transition-colors hover:bg-accent",
                      rows.length === 0 && "text-muted-foreground/60",
                    )}
                  >
                    {rows.length === 0 ? (
                      <span className="text-xs">+ בבית</span>
                    ) : (
                      rows.map((a) => (
                        <NameChip key={a.id} s={sambatzById.get(a.sambatz_id)} />
                      ))
                    )}
                  </button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
