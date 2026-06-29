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
  note: string;
  attack: string;
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
  dayText?: Map<string, { note?: string; attack?: string }>,
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
    const text = dayText?.get(dk);
    return {
      date,
      weekday: WEEKDAY_HE[date.getDay()],
      ddmm: ddmm(date),
      cells: slots.map((slot) => ({
        slot,
        names: byCell.get(`${dk}|${slot.startHour}`) ?? [],
      })),
      home: homeByDate.get(dk) ?? [],
      note: text?.note ?? "",
      attack: text?.attack ?? "",
    };
  });
}

// Format the week roster as a WhatsApp message (Hebrew, RTL-friendly).
export function formatWhatsAppMessage(
  roster: RosterDay[],
  opts: { showAttack?: boolean } = {},
): string {
  const showAttack = opts.showAttack !== false;
  if (roster.length === 0) return "";
  const first = roster[0];
  const last = roster[roster.length - 1];

  const lines: string[] = [`📋 *שבצק חמל* ${first.ddmm}–${last.ddmm}`];

  for (const day of roster) {
    lines.push(""); // blank line separates days for readability
    lines.push(`*${day.weekday} ${day.ddmm}*`);
    for (const cell of day.cells) {
      const names = cell.names.length ? cell.names.join(", ") : "—";
      lines.push(`🕐 ${cell.slot.label}  ${names}`);
    }
    if (day.home.length) {
      lines.push(`🏠 בבית: ${day.home.join(", ")}`);
    }
    if (day.note) {
      lines.push(`📝 הערות: ${day.note}`);
    }
    if (showAttack && day.attack) {
      lines.push(`⚔️ התקפי: ${day.attack}`);
    }
  }

  return lines.join("\n");
}
