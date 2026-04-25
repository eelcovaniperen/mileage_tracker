// One-off migration: add FuelEntry.fuelType column and backfill existing rows.
// Run order:
//   1) node scripts/migrate-add-fuel-type.js   (adds column nullable + backfills)
//   2) npx prisma db push                      (enforces NOT NULL from schema)
//
// Backfill rule: vehicles whose name contains "stelvio" -> "Euro 98",
//                everything else -> "Euro 95".
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  console.log('Adding fuelType column (nullable) if missing...');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "fuelType" TEXT'
  );

  console.log('Backfilling Stelvio entries -> Euro 98...');
  const stelvioCount = await prisma.$executeRawUnsafe(`
    UPDATE "FuelEntry"
    SET "fuelType" = 'Euro 98'
    WHERE "fuelType" IS NULL
      AND "vehicleId" IN (SELECT id FROM "Vehicle" WHERE name ILIKE '%stelvio%')
  `);
  console.log(`  -> ${stelvioCount} rows updated`);

  console.log('Backfilling remaining entries -> Euro 95...');
  const restCount = await prisma.$executeRawUnsafe(`
    UPDATE "FuelEntry" SET "fuelType" = 'Euro 95' WHERE "fuelType" IS NULL
  `);
  console.log(`  -> ${restCount} rows updated`);

  const summary = await prisma.$queryRawUnsafe(
    `SELECT "fuelType", COUNT(*)::int AS count FROM "FuelEntry" GROUP BY "fuelType" ORDER BY "fuelType"`
  );
  console.log('\nFinal distribution:');
  for (const row of summary) console.log(`  ${row.fuelType}: ${row.count}`);

  console.log('\nNext step: run `npx prisma db push` to enforce NOT NULL.');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
