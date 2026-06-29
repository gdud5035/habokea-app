// Week + shift-slot helpers for the שבצק חמל roster grid.
import { formatDateForInput } from "@/lib/utils/format";

export type Slot = {
  startHour: number; // 0-23, the slot's start hour
  endHour: number; // 1-24
  label: string; // e.g. "08:00–16:00"
};

// Add `n` days to a date (returns a new Date at local midnight).
export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

// Sunday (00:00 local) of the week containing `date`.
export function getWeekStart(date: Date): Date {
  return addDays(date, -date.getDay());
}

// The 7 days (Sunday → Saturday) of the week starting at `weekStart`.
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// Tile a 24h day from 00:00 into slots of `shiftLengthHours`.
// The last slot may be shorter if the length doesn't divide 24.
export function computeSlots(shiftLengthHours: number): Slot[] {
  const len = Math.max(1, Math.min(24, Math.floor(shiftLengthHours) || 8));
  const slots: Slot[] = [];
  for (let start = 0; start < 24; start += len) {
    const end = Math.min(start + len, 24);
    slots.push({
      startHour: start,
      endHour: end,
      label: `${pad(start)}:00–${pad(end === 24 ? 24 : end)}:00`,
    });
  }
  return slots;
}

// YYYY-MM-DD key for a date (used as the DB `shift_date` value).
export function dateKey(date: Date): string {
  return formatDateForInput(date);
}
