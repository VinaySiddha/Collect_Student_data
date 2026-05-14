// Dates stored in DB are already IST strings ("YYYY-MM-DD HH:MM:SS").
// Append a fake UTC offset so Date() doesn't shift them.
function parseIST(value: string | Date): Date {
  if (value instanceof Date) return value;
  // "2026-05-14 18:47:54" → "2026-05-14T18:47:54+05:30"
  const s = value.includes('T') ? value : value.replace(' ', 'T');
  const withTz = s.includes('+') || s.endsWith('Z') ? s : `${s}+05:30`;
  return new Date(withTz);
}

export function formatIST(value: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = parseIST(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });
}

export function formatISTDate(value: string | Date): string {
  return formatIST(value, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatISTTime(value: string | Date): string {
  return formatIST(value, { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatISTDateTime(value: string | Date): string {
  return formatIST(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
