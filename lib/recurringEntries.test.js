const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { nextPeriod, periodsOverlap, ensureRecurringEntries } = require('./recurringEntries');

function utc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function mockPrisma() {
  const store = { roadTaxEntry: [], insuranceEntry: [] };
  return {
    roadTaxEntry: {
      create: async ({ data }) => {
        const row = { id: `rt-${store.roadTaxEntry.length + 1}`, ...data };
        store.roadTaxEntry.push(row);
        return row;
      }
    },
    insuranceEntry: {
      create: async ({ data }) => {
        const row = { id: `in-${store.insuranceEntry.length + 1}`, ...data };
        store.insuranceEntry.push(row);
        return row;
      }
    },
    _store: store
  };
}

describe('nextPeriod', () => {
  it('advances a calendar month from Apr 1-30 to May 1-31', () => {
    const next = nextPeriod(utc('2026-04-01'), utc('2026-04-30'));
    assert.equal(ymd(next.startDate), '2026-05-01');
    assert.equal(ymd(next.endDate), '2026-05-31');
  });

  it('advances a calendar year from Jan 1-Dec 31 to the next year', () => {
    const next = nextPeriod(utc('2026-01-01'), utc('2026-12-31'));
    assert.equal(ymd(next.startDate), '2027-01-01');
    assert.equal(ymd(next.endDate), '2027-12-31');
  });

  it('copies exact day length for irregular ranges', () => {
    const next = nextPeriod(utc('2026-01-15'), utc('2026-02-14'));
    assert.equal(ymd(next.startDate), '2026-02-15');
    assert.equal(ymd(next.endDate), '2026-03-17');
  });
});

describe('periodsOverlap', () => {
  it('detects inclusive overlap', () => {
    assert.equal(
      periodsOverlap(utc('2026-04-01'), utc('2026-04-30'), utc('2026-04-15'), utc('2026-05-15')),
      true
    );
    assert.equal(
      periodsOverlap(utc('2026-04-01'), utc('2026-04-30'), utc('2026-05-01'), utc('2026-05-31')),
      false
    );
  });
});

describe('ensureRecurringEntries', () => {
  it('creates nothing when a type has no seed row', async () => {
    const prisma = mockPrisma();
    const result = await ensureRecurringEntries(prisma, {
      id: 'v1',
      soldDate: null,
      roadTaxEntries: [],
      insuranceEntries: []
    }, { now: utc('2026-06-15') });
    assert.equal(result.roadTaxCreated.length, 0);
    assert.equal(result.insuranceCreated.length, 0);
  });

  it('fills monthly tax and insurance from March through June', async () => {
    const prisma = mockPrisma();
    const result = await ensureRecurringEntries(prisma, {
      id: 'v1',
      soldDate: null,
      roadTaxEntries: [{
        startDate: utc('2026-03-01'),
        endDate: utc('2026-03-31'),
        cost: 40,
        notes: 'monthly'
      }],
      insuranceEntries: [{
        startDate: utc('2026-03-01'),
        endDate: utc('2026-03-31'),
        cost: 80,
        notes: null,
        provider: 'ANWB',
        policyNumber: 'P1',
        coverage: 'comprehensive'
      }]
    }, { now: utc('2026-06-15') });

    assert.deepEqual(result.roadTaxCreated.map((e) => ymd(e.startDate)), [
      '2026-04-01', '2026-05-01', '2026-06-01'
    ]);
    assert.equal(result.roadTaxCreated[0].cost, 40);
    assert.equal(result.insuranceCreated.length, 3);
    assert.equal(result.insuranceCreated[0].provider, 'ANWB');
    assert.equal(result.insuranceCreated[0].policyNumber, 'P1');
  });

  it('is a no-op on a second run', async () => {
    const prisma = mockPrisma();
    const vehicle = {
      id: 'v1',
      soldDate: null,
      roadTaxEntries: [{
        startDate: utc('2026-03-01'),
        endDate: utc('2026-03-31'),
        cost: 40,
        notes: null
      }],
      insuranceEntries: []
    };
    const first = await ensureRecurringEntries(prisma, vehicle, { now: utc('2026-06-15') });
    vehicle.roadTaxEntries = [...vehicle.roadTaxEntries, ...first.roadTaxCreated];
    const second = await ensureRecurringEntries(prisma, vehicle, { now: utc('2026-06-15') });
    assert.equal(second.roadTaxCreated.length, 0);
  });

  it('does not create periods that start after soldDate', async () => {
    const prisma = mockPrisma();
    const result = await ensureRecurringEntries(prisma, {
      id: 'v1',
      soldDate: utc('2026-04-20'),
      roadTaxEntries: [{
        startDate: utc('2026-03-01'),
        endDate: utc('2026-03-31'),
        cost: 40,
        notes: null
      }],
      insuranceEntries: []
    }, { now: utc('2026-06-15') });
    assert.deepEqual(result.roadTaxCreated.map((e) => ymd(e.startDate)), ['2026-04-01']);
  });

  it('skips an overlapping slot and still fills a later hole', async () => {
    const prisma = mockPrisma();
    const result = await ensureRecurringEntries(prisma, {
      id: 'v1',
      soldDate: null,
      roadTaxEntries: [
        { startDate: utc('2026-03-01'), endDate: utc('2026-03-31'), cost: 40, notes: null },
        { startDate: utc('2026-05-01'), endDate: utc('2026-05-31'), cost: 99, notes: 'existing' }
      ],
      insuranceEntries: []
    }, { now: utc('2026-06-15') });
    assert.deepEqual(result.roadTaxCreated.map((e) => ymd(e.startDate)), [
      '2026-04-01', '2026-06-01'
    ]);
    assert.equal(result.roadTaxCreated[0].cost, 99);
    assert.equal(result.roadTaxCreated[1].cost, 99);
  });

  it('does not create the next year until that year has started', async () => {
    const prisma = mockPrisma();
    const result = await ensureRecurringEntries(prisma, {
      id: 'v1',
      soldDate: null,
      roadTaxEntries: [{
        startDate: utc('2026-01-01'),
        endDate: utc('2026-12-31'),
        cost: 400,
        notes: null
      }],
      insuranceEntries: []
    }, { now: utc('2026-08-16') });
    assert.equal(result.roadTaxCreated.length, 0);
  });
});
