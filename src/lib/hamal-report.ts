// Shared roster-building helpers for שבצק חמל (used by the WhatsApp message
// and the PDF route). Pure functions — no React, no Supabase.
import { WEEKDAY_HE } from "@/lib/constants";
import { HOME_SLOT, dateKey, type Slot } from "@/lib/utils/week";
import type { HamalAssignmentRow } from "@/types/database";

export type RosterCell = { slot: Slot; names: string[] };
export type RosterDay = {
  date: Date;
  weekday: string;
  ddmm: string;
  cells: RosterCell[];
  home: string[];
};

function ddmm(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

// Build a per-day structured roster for a week.
export function buildWeekRoster(
  days: Date[],
  slots: Slot[],
  assignments: HamalAssignmentRow[],
  nameById: Map<string, string>,
): RosterDay[] {
  const byCell = new Map<string, string[]>();
  const homeByDate = new Map<string, string[]>();
  for (const a of assignments) {
    const name = nameById.get(a.sambatz_id) ?? "—";
    if (a.slot_start_hour === HOME_SLOT) {
      const arr = homeByDate.get(a.shift_date);
      if (arr) arr.push(name);
      else homeByDate.set(a.shift_date, [name]);
    } else {
      const key = `${a.shift_date}|${a.slot_start_hour}`;
      const arr = byCell.get(key);
      if (arr) arr.push(name);
      else byCell.set(key, [name]);
    }
  }

  return days.map((date) => {
    const dk = dateKey(date);
    return {
      date,
      weekday: WEEKDAY_HE[date.getDay()],
      ddmm: ddmm(date),
      cells: slots.map((slot) => ({
        slot,
        names: byCell.get(`${dk}|${slot.startHour}`) ?? [],
      })),
      home: homeByDate.get(dk) ?? [],
    };
  });
}

// Format the week roster as a WhatsApp message (Hebrew, RTL-friendly).
export function formatWhatsAppMessage(roster: RosterDay[]): string {
  if (roster.length === 0) return "";
  const first = roster[0];
  const last = roster[roster.length - 1];
  let msg = `*שבצק חמל — ${first.ddmm}–${last.ddmm}*\n\n`;

  for (const day of roster) {
    msg += `*${day.weekday} ${day.ddmm}*\n`;
    for (const cell of day.cells) {
      const names = cell.names.length ? cell.names.join(", ") : "—";
      msg += `${cell.slot.label}: ${names}\n`;
    }
    if (day.home.length) {
      msg += `בבית: ${day.home.join(", ")}\n`;
    }
    msg += `\n`;
  }
  return msg.trim();
}
