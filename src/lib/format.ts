const dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
const numFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function formatRange(start: string, end: string): string {
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatNumber(n: number): string {
  return numFmt.format(n);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${formatNumber(amount)} ${currency}`;
  }
}

export function stars(n?: number): string {
  if (!n) return '';
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
