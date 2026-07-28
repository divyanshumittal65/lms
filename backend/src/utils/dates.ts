export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toSqlDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function calculateFine(dueDate: Date, returnDate: Date, finePerDay = 10) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const lateDays = Math.max(
    0,
    Math.ceil((startOfDay(returnDate).getTime() - startOfDay(dueDate).getTime()) / msPerDay)
  );
  return lateDays * finePerDay;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
