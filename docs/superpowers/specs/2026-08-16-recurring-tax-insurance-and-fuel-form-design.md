# Recurring road tax / insurance catch-up and fuel form field order

Date: 2026-08-16  
Status: approved design, pending implementation  
App: DriveTotal (mileage_tracker)  
Production: Vercel `api/handler.js` + `api/dashboard/stats.js` against Neon

## Problem

Road tax and insurance are almost always the same amount every period, but the user has to add each period by hand. Fuel add/edit hides trip distance and price/liter behind Quick add, even though those two belong next to odometer and cost.

## Goals

1. After the user enters one road-tax period and one insurance period per vehicle, later periods appear automatically when they open the vehicle or the dashboard.
2. On the fuel form, trip distance sits after odometer and price/liter sits after cost, always visible.

## Non-goals

- New tables, templates, cron jobs, or per-vehicle toggles
- Reminders or email
- Changing how the first period is created
- Fixing restore scripts (`import-to-neon.js`) or the backup path
- Redesigning road-tax / insurance forms or the Duplicate button

## Decisions (locked)

| Topic | Choice |
|---|---|
| When it runs | On read: vehicle GET and dashboard stats GET |
| How far | Fill every missing period whose start is on or before today |
| Period length | Same shape as the latest existing entry (monthly stays monthly, yearly stays yearly) |
| First row | User still creates it |
| Sold vehicles | Do not create a period whose start is after `soldDate` |
| Fuel fields | Always visible, new order; Quick add no longer hides them |

## Architecture

One shared helper, no schema change. Existing `RoadTaxEntry` and `InsuranceEntry` rows are the source of truth.

```
lib/recurringEntries.js
  ensureRecurringEntries(prisma, vehicle) -> { roadTaxCreated, insuranceCreated }

Called from:
  api/handler.js              handleVehicleGet   (production vehicle page)
  api/dashboard/stats.js      GET handler        (production dashboard)
  server/src/routes/vehicles.js   GET /:id       (Express parity)
  server/src/routes/dashboard.js  GET /stats     (Express parity)
```

`vehicle` must include `soldDate`, `roadTaxEntries`, and `insuranceEntries`. After catch-up, the caller must use the updated entry lists for response stats (re-query or append created rows). Production vehicle GET already includes those relations; production dashboard already includes them. Express vehicle GET currently includes only `fuelEntries` — that route must include tax/insurance (and soldDate is already on the vehicle) so the helper can run and so local/prod stay aligned.

Catch-up is wrapped in try/catch at each call site. A failure is logged and the request still returns existing data. The page never fails because catch-up failed.

No new API routes. Create/update/delete endpoints stay unchanged. Copied rows are ordinary rows and can be edited or deleted.

## Catch-up algorithm

Run independently for road tax and for insurance.

1. If the vehicle has no entries of that type, return (nothing to copy).
2. Sort entries by `endDate` ascending, then `startDate`, then `createdAt`. Latest = last.
3. Compute the next candidate period from the latest entry (see Period math).
4. While `nextStart` (date only) is on or before today (UTC date):
   - If the vehicle has `soldDate` and `nextStart` is after `soldDate` (date only), stop.
   - If any existing entry overlaps `[nextStart, nextEnd]` (inclusive: `a.start <= b.end && b.start <= a.end`), skip this slot and still advance to the following candidate from this slot (so a hole after an overlap can still fill).
   - Else insert a new row:
     - Road tax: `startDate`, `endDate`, `cost`, `notes` from the latest *source* entry (the latest real row before this walk started). Cost and notes do not change across the catch-up batch.
     - Insurance: same, plus `provider`, `policyNumber`, `coverage` from that source entry.
   - Advance: compute the next candidate from the period just considered (created or skipped).
5. Cap the loop at 120 iterations so a bad date cannot run forever.

Today and all comparisons use the UTC calendar date (`YYYY-MM-DD`), matching how the forms store dates via `toISOString().split('T')[0]`.

### Period math

Inputs: previous `startDate` and `endDate` (UTC dates).

- `nextStart` = calendar day after `endDate`.
- Inclusive day count `D` = number of UTC dates from `startDate` through `endDate`.

Then `nextEnd`:

1. If `startDate` is the 1st of its month and `endDate` is the last day of its month, and they are the **same** calendar month: `nextEnd` = last day of the month that contains `nextStart`.  
   Example: 2026-04-01 … 2026-04-30 → 2026-05-01 … 2026-05-31.
2. Else if `startDate` is the 1st of its month and `endDate` is the last day of its month, and `D >= 360`: `nextEnd` = last day of the month twelve months after `nextStart`’s month.  
   Example: 2026-01-01 … 2026-12-31 → 2027-01-01 … 2027-12-31.
3. Else: `nextEnd` = `nextStart` plus `(D - 1)` calendar days.  
   Example: 2026-01-15 … 2026-02-14 (D=31) → 2026-02-15 … 2026-03-17.

This is the locked rule: month-bounded calendar months and years keep month ends (Apr 30 → May 31); irregular ranges copy exact day length.

### Idempotency and races

Overlap skip makes a second load a no-op. Dashboard GET and vehicle GET can run at the same time. Each insert happens after a re-read of that vehicle’s entries of that type (same request, after any inserts already done in this walk). A rare concurrent double-insert is acceptable; there is no unique index. Do not add a schema constraint in this change.

### Delete and recreate

Copied rows are normal rows. If the user deletes the latest period and then opens the vehicle or dashboard again, catch-up recreates it when that period’s start is still on or before today. That is intended.

### Source row for copied fields

Cost, notes, and insurance extras always come from the latest entry that existed **before** this catch-up walk, not from a row created earlier in the same walk. All newly created periods in one walk therefore share the same amount and details.

## Fuel form

File: `client/src/pages/VehicleDetail.jsx` add/edit fuel form only.

Always-visible order:

1. Date
2. Odometer (km)
3. Trip distance (km)  — moved out of the Quick-add-hidden block
4. Fuel amount (L)
5. Cost (EUR)
6. Price/liter — moved out of the Quick-add-hidden block
7. Fuel type

Then, still hidden when Quick add is on: gas station, tyres, notes, plus the full-tank checkbox and submit button.

Editing an existing entry uses the same order. No API or schema change. Existing auto-calc of trip distance / price per liter (if any) stays as-is; this change is layout only.

## Error handling

- Catch-up errors: log, do not change the HTTP status of the parent GET.
- Invalid existing dates (missing start/end): skip that type for that vehicle.
- `cost` copied as the numeric value already stored; do not re-parse or round beyond what Prisma already has.

## Testing / verification

Production-only user: verify on https://mileagetracker-lac.vercel.app after deploy.

Cases:

1. Vehicle with a March monthly tax and insurance row, opened in June → April, May, June created once; reload creates nothing extra.
2. Latest period is a full calendar year → only the next year is created, and only once that year’s start is on or before today.
3. Vehicle with `soldDate` → no new period with start after that date.
4. A later overlapping period already exists → that slot is skipped; later holes can still fill.
5. Dashboard load on a vehicle not opened this month → same new rows as opening the vehicle.
6. Vehicle with no tax/insurance rows → nothing created.
7. New fuel save still persists trip distance and price/liter; both fields visible with Quick add on.
8. Both production handlers and Express routes call the same helper.

## Implementation notes

- Dual API: production is authoritative (`api/handler.js`, `api/dashboard/stats.js`). Express copies must call the same helper so a future local session does not miss catch-up.
- Do not put catch-up logic only in the React client.
- No Prisma migrate / `db push`. No new env vars.
- After implementation: commit, push, `npx vercel --prod --yes` per project instructions.

## Files to change

| File | Change |
|---|---|
| `lib/recurringEntries.js` | New helper |
| `api/handler.js` | Call helper in `handleVehicleGet` before stats |
| `api/dashboard/stats.js` | Call helper per vehicle before aggregating |
| `server/src/routes/vehicles.js` | Include tax/insurance; call helper |
| `server/src/routes/dashboard.js` | Include tax/insurance; call helper |
| `client/src/pages/VehicleDetail.jsx` | Reorder fuel fields; promote trip distance and price/liter |
