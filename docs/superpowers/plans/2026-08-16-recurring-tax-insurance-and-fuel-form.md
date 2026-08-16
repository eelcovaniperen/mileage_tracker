# Recurring Tax/Insurance Catch-up and Fuel Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-create missing road-tax and insurance periods on vehicle/dashboard GET, and put trip distance and price/liter on the main fuel form row.

**Architecture:** Pure date/period helpers plus `ensureRecurringEntries(prisma, vehicle, { now })` in `lib/recurringEntries.js`. Production `api/handler.js` and `api/dashboard/stats.js` call it after load, before stats. Express routes call the same helper. Fuel form change is layout-only in `VehicleDetail.jsx`.

**Tech Stack:** Node.js built-in test runner (`node --test`), Prisma, Vercel serverless, React.

---

### Task 1: Period math and catch-up helper (TDD)

**Files:**
- Create: `lib/recurringEntries.test.js`
- Create: `lib/recurringEntries.js`

- [ ] **Step 1: Write the failing tests** for `nextPeriod` spec examples and `ensureRecurringEntries` catch-up / sold / overlap / no-seed cases.

- [ ] **Step 2: Run tests and confirm they fail** (`node --test lib/recurringEntries.test.js`) because the module does not exist.

- [ ] **Step 3: Implement `lib/recurringEntries.js`** exporting `utcDateOnly`, `nextPeriod`, `periodsOverlap`, `ensureRecurringEntries`.

- [ ] **Step 4: Run tests and confirm they pass.**

- [ ] **Step 5: Commit** helper + tests.

### Task 2: Wire production and Express GET paths

**Files:**
- Modify: `api/handler.js` (`handleVehicleGet`)
- Modify: `api/dashboard/stats.js` (before per-vehicle aggregation)
- Modify: `server/src/routes/vehicles.js` (`GET /:id` includes + helper)
- Modify: `server/src/routes/dashboard.js` (`GET /stats` includes + helper)

- [ ] **Step 1: Call `ensureRecurringEntries` in try/catch; append created rows so stats include them.**
- [ ] **Step 2: Commit**

### Task 3: Fuel form field order

**Files:**
- Modify: `client/src/pages/VehicleDetail.jsx` fuel form

- [ ] **Step 1: Always-visible order** Date, Odometer, Trip distance, Fuel amount, Cost, Price/liter, Fuel type. Quick add still hides gas station, tyres, notes.
- [ ] **Step 2: Commit**

### Task 4: Ship

- [ ] **Step 1:** `node --test lib/recurringEntries.test.js`
- [ ] **Step 2:** Push and `npx vercel --prod --yes`

Spec: `docs/superpowers/specs/2026-08-16-recurring-tax-insurance-and-fuel-form-design.md`
