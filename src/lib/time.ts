import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { copy } from "./copy";

export const fmtTz = (iso: string | Date, tz: string, pattern: string) =>
  formatInTimeZone(typeof iso === "string" ? new Date(iso) : iso, tz, pattern);

/** yyyy-MM-dd for "today" in the given timezone. */
export const todayInTz = (tz: string) => formatInTimeZone(new Date(), tz, "yyyy-MM-dd");

/** Convert a wall-clock date + time in a timezone to a UTC Date. */
export const zonedToUtc = (date: string, time: string, tz: string) =>
  fromZonedTime(`${date}T${time.length === 5 ? time + ":00" : time}`, tz);

export function money(v: number | null | undefined, currency = "EUR") {
  if (v == null) return copy.common.priceOnRequest;
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v);
}

export function dayPart(iso: string, tz: string): "morning" | "afternoon" | "evening" {
  const h = Number(fmtTz(iso, tz, "H"));
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export interface CalEvent {
  title: string;
  start: string;
  end: string;
  details?: string;
  location?: string;
}

export function googleCalendarUrl(e: CalEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(new Date(e.start))}/${utcStamp(new Date(e.end))}`,
    details: e.details ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function buildIcs(e: CalEvent & { uid: string }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotly//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${e.uid}@slotly`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(new Date(e.start))}`,
    `DTEND:${utcStamp(new Date(e.end))}`,
    `SUMMARY:${icsEscape(e.title)}`,
    e.details ? `DESCRIPTION:${icsEscape(e.details)}` : "",
    e.location ? `LOCATION:${icsEscape(e.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadIcs(e: CalEvent & { uid: string }) {
  const blob = new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "booking.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Whether a customer can still cancel a booking online. */
export function canCustomerCancel(startIso: string, windowHours: number, now = new Date()) {
  return new Date(startIso).getTime() - windowHours * 3600_000 >= now.getTime();
}
