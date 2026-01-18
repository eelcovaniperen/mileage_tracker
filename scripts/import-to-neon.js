// Import script - loads backup data into Neon database
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData() {
  console.log('Starting data import to Neon...\n');

  // Find the most recent full backup
  const backupDir = path.join(__dirname, '../backups');
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-full-'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('No full backup files found');
  }

  const backupFile = path.join(backupDir, files[0]);
  console.log(`Using backup file: ${files[0]}`);

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log(`Backup from: ${backup.exportedAt}\n`);

  try {
    for (const user of backup.data.users) {
      console.log(`Importing user: ${user.email}`);

      // Create user
      const createdUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          createdAt: new Date(user.createdAt)
        }
      });
      console.log(`  Created user: ${createdUser.id}`);

      // Create vehicles
      for (const vehicle of user.vehicles) {
        console.log(`  Importing vehicle: ${vehicle.name}`);

        await prisma.vehicle.create({
          data: {
            id: vehicle.id,
            name: vehicle.name,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            photo: vehicle.photo,
            initialOdometer: vehicle.initialOdometer,
            purchasePrice: vehicle.purchasePrice,
            purchaseDate: vehicle.purchaseDate ? new Date(vehicle.purchaseDate) : null,
            registrationCost: vehicle.registrationCost,
            otherInitialCosts: vehicle.otherInitialCosts,
            insuranceCostYearly: vehicle.insuranceCostYearly,
            roadTaxYearly: vehicle.roadTaxYearly,
            depreciationYearly: vehicle.depreciationYearly,
            financingMonthlyPayment: vehicle.financingMonthlyPayment,
            financingInterestRate: vehicle.financingInterestRate,
            financingStartDate: vehicle.financingStartDate ? new Date(vehicle.financingStartDate) : null,
            financingEndDate: vehicle.financingEndDate ? new Date(vehicle.financingEndDate) : null,
            financingTotalAmount: vehicle.financingTotalAmount,
            soldDate: vehicle.soldDate ? new Date(vehicle.soldDate) : null,
            soldPrice: vehicle.soldPrice,
            userId: user.id,
            createdAt: new Date(vehicle.createdAt)
          }
        });

        // Import fuel entries
        if (vehicle.fuelEntries?.length > 0) {
          console.log(`    Importing ${vehicle.fuelEntries.length} fuel entries...`);
          await prisma.fuelEntry.createMany({
            data: vehicle.fuelEntries.map(entry => ({
              id: entry.id,
              date: new Date(entry.date),
              odometer: entry.odometer,
              fuelAmount: entry.fuelAmount,
              cost: entry.cost,
              fullTank: entry.fullTank,
              notes: entry.notes,
              gasStation: entry.gasStation,
              tripDistance: entry.tripDistance,
              pricePerLiter: entry.pricePerLiter,
              tyres: entry.tyres,
              vehicleId: vehicle.id,
              createdAt: new Date(entry.createdAt)
            }))
          });
        }

        // Import maintenance entries
        if (vehicle.maintenanceEntries?.length > 0) {
          console.log(`    Importing ${vehicle.maintenanceEntries.length} maintenance entries...`);
          await prisma.maintenanceEntry.createMany({
            data: vehicle.maintenanceEntries.map(entry => ({
              id: entry.id,
              date: new Date(entry.date),
              description: entry.description,
              cost: entry.cost,
              odometer: entry.odometer,
              category: entry.category,
              provider: entry.provider,
              notes: entry.notes,
              vehicleId: vehicle.id,
              createdAt: new Date(entry.createdAt)
            }))
          });
        }

        // Import road tax entries
        if (vehicle.roadTaxEntries?.length > 0) {
          console.log(`    Importing ${vehicle.roadTaxEntries.length} road tax entries...`);
          await prisma.roadTaxEntry.createMany({
            data: vehicle.roadTaxEntries.map(entry => ({
              id: entry.id,
              startDate: new Date(entry.startDate),
              endDate: new Date(entry.endDate),
              cost: entry.cost,
              notes: entry.notes,
              vehicleId: vehicle.id,
              createdAt: new Date(entry.createdAt)
            }))
          });
        }

        // Import insurance entries
        if (vehicle.insuranceEntries?.length > 0) {
          console.log(`    Importing ${vehicle.insuranceEntries.length} insurance entries...`);
          await prisma.insuranceEntry.createMany({
            data: vehicle.insuranceEntries.map(entry => ({
              id: entry.id,
              provider: entry.provider,
              policyNumber: entry.policyNumber,
              startDate: new Date(entry.startDate),
              endDate: new Date(entry.endDate),
              cost: entry.cost,
              coverageType: entry.coverageType,
              notes: entry.notes,
              vehicleId: vehicle.id,
              createdAt: new Date(entry.createdAt)
            }))
          });
        }
      }
    }

    console.log('\n--- Import Statistics ---');
    const userCount = await prisma.user.count();
    const vehicleCount = await prisma.vehicle.count();
    const fuelCount = await prisma.fuelEntry.count();
    const maintenanceCount = await prisma.maintenanceEntry.count();
    const roadTaxCount = await prisma.roadTaxEntry.count();
    const insuranceCount = await prisma.insuranceEntry.count();

    console.log(`Users: ${userCount}`);
    console.log(`Vehicles: ${vehicleCount}`);
    console.log(`Fuel Entries: ${fuelCount}`);
    console.log(`Maintenance Entries: ${maintenanceCount}`);
    console.log(`Road Tax Entries: ${roadTaxCount}`);
    console.log(`Insurance Entries: ${insuranceCount}`);

    return { success: true };
  } catch (error) {
    console.error('Import failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData()
  .then(() => {
    console.log('\nImport completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nImport failed:', error.message);
    process.exit(1);
  });
