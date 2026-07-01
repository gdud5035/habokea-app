// Shared formatting helpers ported from the original Angular app.

// Format a date as DD/MM/YY (display).
export function formatDateHebrew(input?: string | Date | null): string {
  if (!input) return "";
  const date = new Date(input);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

// Format a date+time as DD/MM/YY HH:mm (display) — used for "last updated".
export function formatDateTimeHebrew(input?: string | Date | null): string {
  if (!input) return "";
  const date = new Date(input);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Format a date as YYYY-MM-DD for <input type="date"> (local time).
export function formatDateForInput(input?: string | Date | null): string {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// True if the date is within the next 0..7 days (cell warning highlight).
export function isDateNear(input?: string | Date | null): boolean {
  if (!input) return false;
  const today = new Date();
  const target = new Date(input);
  if (isNaN(target.getTime())) return false;
  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 0 && diffDays <= 7;
}
