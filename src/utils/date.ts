// Date helpers for the outfit calendar. No date library in the project — these
// are hand-built and use LOCAL date parts (not toISOString, which would shift
// across the UTC boundary and land on the wrong calendar day).

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-date YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Inclusive YYYY-MM-DD bounds for a month (month is 0-based, like Date). */
export function monthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: toISODate(new Date(year, month, 1)),
    end: toISODate(new Date(year, month + 1, 0)),
  };
}

/**
 * Monday-first month grid: weeks of 7 cells; `null` = leading/trailing blank.
 * In-month cells are ISO date strings.
 */
export function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=Sun..6=Sat → Monday-first index 0=Mon..6=Sun.
  const leading = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toISODate(new Date(year, month, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

/** Parse an ISO date as a LOCAL date (avoids UTC parsing of "YYYY-MM-DD"). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "6 月 14 日" */
export function formatMonthDay(iso: string): string {
  const d = parseISO(iso);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** "6 月 14 日 周六" */
export function formatAgendaDate(iso: string): string {
  const d = parseISO(iso);
  return `${formatMonthDay(iso)} 周${WEEKDAY_CN[d.getDay()]}`;
}
