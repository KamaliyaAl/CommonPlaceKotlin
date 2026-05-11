// Cyprus is the only timezone this app cares about.
// Stored event times are ISO 8601 wall-clock strings interpreted as
// Asia/Nicosia local time, e.g. "2026-05-06T18:00:00".
// Legacy strings ending in `Z` (or with a numeric offset) are also
// treated as Cyprus wall-clock — historically the app appended `Z`
// to local input by mistake, and the user's intent was always Cyprus.

export const CYPRUS_TZ = "Asia/Nicosia";

function cyprusOffsetMinutes(utcMs: number): number {
  // Returns the offset (in minutes) such that:
  //   cyprusWallClockMs = utcMs + offsetMinutes * 60_000
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CYPRUS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  let h = get("hour");
  if (h === 24) h = 0;
  const cypAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    h,
    get("minute"),
    get("second")
  );
  return Math.round((cypAsUtc - utcMs) / 60_000);
}

/**
 * Parse a stored event time string as Cyprus wall-clock and return the
 * corresponding `Date`. Works regardless of the device timezone.
 *
 * Strips trailing `Z` and any explicit `±HH:MM` offset before interpreting,
 * so legacy entries created with `…Z` (back when AddScreen mistakenly added
 * one) still render at the wall-clock the user originally typed.
 */
export function parseCyprusDate(iso?: string | null): Date {
  if (!iso) return new Date(NaN);
  let s = iso.trim();
  if (s.endsWith("Z") || s.endsWith("z")) s = s.slice(0, -1);
  s = s.replace(/[+-]\d{2}:?\d{2}$/, "");
  if (!s.includes("T")) s = `${s}T00:00:00`;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const se = Number(m[6] ?? "0");

  // First guess: treat the wall-clock numbers as if they were UTC,
  // then subtract Cyprus's offset for that instant.
  const guessUtc = Date.UTC(y, mo - 1, d, h, mi, se);
  const off1 = cyprusOffsetMinutes(guessUtc);
  let result = guessUtc - off1 * 60_000;
  // Re-check around DST transitions: re-compute offset for the resulting
  // instant and adjust if needed (handles spring-forward / fall-back).
  const off2 = cyprusOffsetMinutes(result);
  if (off2 !== off1) {
    result = guessUtc - off2 * 60_000;
  }
  return new Date(result);
}

/**
 * Format a stored Cyprus wall-clock ISO string as "HH:mm" exactly as
 * the user entered it, without any tz conversion.
 */
export function formatCyprusHHmm(iso?: string | null): string {
  if (!iso) return "?";
  if (!iso.includes("T")) return iso;
  const timePart = iso.split("T")[1];
  if (!timePart) return "?";
  return timePart.slice(0, 5);
}

/**
 * Format an ISO string as a human-readable Cyprus date (and optional time).
 * Pass `withTime: false` to skip time even if the input has one.
 */
export function formatCyprusDate(
  iso?: string | null,
  opts: { withTime?: boolean } = {}
): string {
  if (!iso) return "";
  const includeTime = opts.withTime ?? iso.includes("T");
  const date = parseCyprusDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CYPRUS_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

/**
 * Build a stored event timestamp string from a YYYY-MM-DD date and an
 * optional HH:mm Cyprus-local time. Returns the canonical no-timezone
 * ISO form the rest of the app expects.
 */
export function buildCyprusTimestamp(date: string, hhmm?: string | null, fallback: "start" | "end" = "start"): string {
  const t = (hhmm || "").trim();
  if (t) return `${date}T${t}:00`;
  return fallback === "end" ? `${date}T23:59:59` : `${date}T00:00:00`;
}

/**
 * "now" expressed as milliseconds since epoch — so it can be compared
 * directly against `parseCyprusDate(...).getTime()`.
 */
export function nowMs(): number {
  return Date.now();
}
