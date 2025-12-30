const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Car ID mapping
const carMapping = {
  1: { name: 'VW Touran', make: 'Volkswagen', model: 'Touran' },
  2: { name: 'Skoda Octavia', make: 'Skoda', model: 'Octavia' },
  5: { name: 'Moto Guzzi Stelvio', make: 'Moto Guzzi', model: 'Stelvio' }
};

async function importData() {
  try {
    // Get the first user (or create one if needed)
    let user = await prisma.user.findFirst();

    if (!user) {
      console.log('No user found. Please register a user first.');
      process.exit(1);
    }

    console.log(`Importing data for user: ${user.email}`);

    // Create vehicles
    const vehicleIds = {};
    for (const [carId, vehicleData] of Object.entries(carMapping)) {
      // Check if vehicle already exists
      let vehicle = await prisma.vehicle.findFirst({
        where: {
          userId: user.id,
          name: vehicleData.name
        }
      });

      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            name: vehicleData.name,
            make: vehicleData.make,
            model: vehicleData.model,
            userId: user.id
          }
        });
        console.log(`Created vehicle: ${vehicleData.name}`);
      } else {
        console.log(`Vehicle already exists: ${vehicleData.name}`);
      }

      vehicleIds[carId] = vehicle.id;
    }

    // Read and parse CSV
    const csvPath = path.join(__dirname, '../../import_data.csv');
    console.log(`Reading CSV from: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    console.log(`\nHeaders found: ${headers.join(', ')}`);
    console.log(`\nProcessing ${lines.length - 1} entries...`);

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.replace(/"/g, '').trim() || null;
      });

      const carId = row.car_id;
      const vehicleId = vehicleIds[carId];

      if (!vehicleId) {
        console.log(`Skipping row ${i}: Unknown car_id ${carId}`);
        skipped++;
        continue;
      }

      // Parse values
      const date = row.date ? new Date(row.date) : null;
      const odometer = parseFloat(row.km_total) || 0;
      const fuelAmount = parseFloat(row.liters) || 0;
      const cost = parseFloat(row.amount) || 0;
      const gasStation = row.gas_station || null;
      const tripDistance = parseFloat(row.km_trip) || null;
      const pricePerLiter = parseFloat(row.liter_price) || null;
      const tyres = row.tyres || null;

      if (!date || odometer === 0) {
        console.log(`Skipping row ${i}: Invalid date or odometer`);
        skipped++;
        continue;
      }

      // Check for duplicate (same vehicle, date, and odometer)
      const existing = await prisma.fuelEntry.findFirst({
        where: {
          vehicleId,
          date,
          odometer
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create fuel entry
      await prisma.fuelEntry.create({
        data: {
          date,
          odometer,
          fuelAmount,
          cost,
          fullTank: true,
          gasStation,
          tripDistance,
          pricePerLiter,
          tyres,
          vehicleId
        }
      });

      imported++;
    }

    console.log(`\nImport complete!`);
    console.log(`Imported: ${imported} entries`);
    console.log(`Skipped: ${skipped} entries`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse CSV line handling quoted values with commas
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

importData();
