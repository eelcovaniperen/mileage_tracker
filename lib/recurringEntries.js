const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_ITERATIONS = 120;

function utcDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }
    value = new Date(value);
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function inclusiveDayCount(start, end) {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function isFirstOfMonth(date) {
  return date.getUTCDate() === 1;
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

function isLastOfMonth(date) {
  const last = lastDayOfMonth(date.getUTCFullYear(), date.getUTCMonth());
  return date.getTime() === last.getTime();
}

function sameUtcMonth(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function nextPeriod(startDate, endDate) {
  const start = utcDateOnly(startDate);
  const end = utcDateOnly(endDate);
  if (!start || !end || end < start) return null;

  const nextStart = addUtcDays(end, 1);
  const days = inclusiveDayCount(start, end);
  let nextEnd;

  if (isFirstOfMonth(start) && isLastOfMonth(end) && sameUtcMonth(start, end)) {
    nextEnd = lastDayOfMonth(nextStart.getUTCFullYear(), nextStart.getUTCMonth());
  } else if (isFirstOfMonth(start) && isLastOfMonth(end) && days >= 360) {
    const endMonthIndex = nextStart.getUTCMonth() + 11;
    const year = nextStart.getUTCFullYear() + Math.floor(endMonthIndex / 12);
    const month = ((endMonthIndex % 12) + 12) % 12;
    nextEnd = lastDayOfMonth(year, month);
  } else {
    nextEnd = addUtcDays(nextStart, days - 1);
  }

  return { startDate: nextStart, endDate: nextEnd };
}

function periodsOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = utcDateOnly(aStart);
  const aE = utcDateOnly(aEnd);
  const bS = utcDateOnly(bStart);
  const bE = utcDateOnly(bEnd);
  if (!aS || !aE || !bS || !bE) return false;
  return aS <= bE && bS <= aE;
}

function compareEntries(a, b) {
  const aEnd = utcDateOnly(a.endDate)?.getTime() ?? 0;
  const bEnd = utcDateOnly(b.endDate)?.getTime() ?? 0;
  if (aEnd !== bEnd) return aEnd - bEnd;
  const aStart = utcDateOnly(a.startDate)?.getTime() ?? 0;
  const bStart = utcDateOnly(b.startDate)?.getTime() ?? 0;
  if (aStart !== bStart) return aStart - bStart;
  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return aCreated - bCreated;
}

async function catchUpType(prisma, vehicle, kind, now) {
  const listKey = kind === 'roadTax' ? 'roadTaxEntries' : 'insuranceEntries';
  const model = kind === 'roadTax' ? prisma.roadTaxEntry : prisma.insuranceEntry;
  const existing = [...(vehicle[listKey] || [])];
  if (existing.length === 0) return [];

  existing.sort(compareEntries);
  const source = existing[existing.length - 1];
  const earliest = existing[0];
  if (!source.startDate || !source.endDate || !earliest.startDate || !earliest.endDate) return [];

  // Walk from the earliest period so holes before the latest row still fill.
  // Cost/notes/insurance extras always come from `source` (latest by endDate).
  let cursor = {
    startDate: utcDateOnly(earliest.startDate),
    endDate: utcDateOnly(earliest.endDate)
  };
  if (!cursor.startDate || !cursor.endDate) return [];

  const today = utcDateOnly(now || new Date());
  const sold = vehicle.soldDate ? utcDateOnly(vehicle.soldDate) : null;
  const known = existing
    .map((entry) => ({
      startDate: utcDateOnly(entry.startDate),
      endDate: utcDateOnly(entry.endDate)
    }))
    .filter((entry) => entry.startDate && entry.endDate);

  const created = [];
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const next = nextPeriod(cursor.startDate, cursor.endDate);
    if (!next) break;
    if (next.startDate > today) break;
    if (sold && next.startDate > sold) break;

    const overlaps = known.some((entry) =>
      periodsOverlap(entry.startDate, entry.endDate, next.startDate, next.endDate)
    );

    if (!overlaps) {
      const data = {
        vehicleId: vehicle.id,
        startDate: next.startDate,
        endDate: next.endDate,
        cost: source.cost,
        notes: source.notes || null
      };
      if (kind === 'insurance') {
        data.provider = source.provider || null;
        data.policyNumber = source.policyNumber || null;
        data.coverage = source.coverage || null;
      }
      const row = await model.create({ data });
      created.push(row);
      known.push(next);
    }

    cursor = next;
  }

  return created;
}

async function ensureRecurringEntries(prisma, vehicle, options = {}) {
  const now = options.now;
  const roadTaxCreated = await catchUpType(prisma, vehicle, 'roadTax', now);
  const insuranceCreated = await catchUpType(prisma, vehicle, 'insurance', now);
  return { roadTaxCreated, insuranceCreated };
}

async function applyRecurringCatchUp(prisma, vehicle, options = {}) {
  try {
    const created = await ensureRecurringEntries(prisma, vehicle, options);
    if (created.roadTaxCreated.length) {
      vehicle.roadTaxEntries = [...(vehicle.roadTaxEntries || []), ...created.roadTaxCreated];
    }
    if (created.insuranceCreated.length) {
      vehicle.insuranceEntries = [...(vehicle.insuranceEntries || []), ...created.insuranceCreated];
    }
    return created;
  } catch (err) {
    console.error('Recurring entry catch-up failed:', err);
    return { roadTaxCreated: [], insuranceCreated: [] };
  }
}

module.exports = {
  utcDateOnly,
  nextPeriod,
  periodsOverlap,
  ensureRecurringEntries,
  applyRecurringCatchUp
};
