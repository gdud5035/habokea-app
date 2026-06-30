// Week + shift-slot helpers for the שבצק חמל roster grid.
import { formatDateForInput } from "@/lib/utils/format";

export type Slot = {
  startHour: number; // 0-23, the slot's start hour
  endHour: number; // 1-24
  startLabel: string; // e.g. "08:00"
  endLabel: string; // e.g. "16:00"
  label: string; // e.g. "08:00–16:00" (compact)
  // Days past the column date these hours fall on. With a non-midnight day
  // start, slots that wrap past midnight (e.g. 00:00–08:00) belong to the
  // *next* calendar day (offset 1) while still shown in the column's day.
  dayOffset: number;
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

// Sentinel slot_start_hour value for the "בבית" (home) row.
export const HOME_SLOT = -1;

// Free-text day rows (stored in hamal_day_text by `kind`).
export const DAY_TEXT_ROWS: { kind: string; label: string }[] = [
  { kind: "note", label: "הערות" },
  { kind: "attack", label: "התקפי" },
];

// Tile a 24h day into slots of `shiftLengthHours`, starting at `startHour`.
// Slots wrap past midnight; a slot's `startHour` is the clock hour (0-23).
export function computeSlots(shiftLengthHours: number, startHour = 0): Slot[] {
  const len = Math.max(1, Math.min(24, Math.floor(shiftLengthHours) || 8));
  const start0 = (((Math.floor(startHour) || 0) % 24) + 24) % 24;
  const count = Math.ceil(24 / len);
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const absStart = start0 + i * len;
    const start = absStart % 24;
    const endRaw = start + len;
    const endClock = endRaw % 24 === 0 ? 24 : endRaw % 24;
    const startLabel = `${pad(start)}:00`;
    const endLabel = `${pad(endClock)}:00`;
    slots.push({
      startHour: start,
      endHour: endClock,
      startLabel,
      endLabel,
      label: `${startLabel}–${endLabel}`,
      dayOffset: Math.floor(absStart / 24),
    });
  }
  return slots;
}

// YYYY-MM-DD key for a date (used as the DB `shift_date` value).
export function dateKey(date: Date): string {
  return formatDateForInput(date);
}

// The actual calendar date (YYYY-MM-DD) a slot's hours fall on for a given
// column day — accounts for slots that wrap past midnight into the next day.
export function effectiveShiftDate(columnDate: Date, slot: Slot): string {
  return dateKey(addDays(columnDate, slot.dayOffset));
}

// Pick a readable text color (black/white) for a given hex background.
export function textOn(bgHex?: string | null): string {
  if (!bgHex) return "inherit";
  const hex = bgHex.replace("#", "");
  if (hex.length !== 6) return "inherit";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Relative luminance (sRGB approximation).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}
