const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Read CSV
  const csvPath = path.join(__dirname, '..', 'import_data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

  const entries = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
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

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });

  console.log(`Found ${entries.length} fuel entries to import`);

  // Create or find user
  let user = await prisma.user.findUnique({
    where: { email: 'eelco@mileagetracker.com' }
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash('mileage123', 10);
    user = await prisma.user.create({
      data: {
        email: 'eelco@mileagetracker.com',
        password: hashedPassword,
        name: 'Eelco'
      }
    });
    console.log('Created user:', user.email);
  } else {
    console.log('Using existing user:', user.email);
  }

  // Define vehicles based on car_ids in CSV
  const vehicleMap = {
    '1': { name: 'Car 1', make: '', model: '' },
    '2': { name: 'Car 2', make: '', model: '' },
    '5': { name: 'Car 3', make: '', model: '' }
  };

  // Create vehicles
  const vehicleIds = {};
  for (const [carId, vehicleData] of Object.entries(vehicleMap)) {
    let vehicle = await prisma.vehicle.findFirst({
      where: { name: vehicleData.name, userId: user.id }
    });

    if (!vehicle) {
      // Find initial odometer from first entry
      const firstEntry = entries.find(e => e.car_id === carId);
      const initialOdometer = firstEntry ? parseFloat(firstEntry.km_total) - parseFloat(firstEntry.km_trip || 0) : 0;

      vehicle = await prisma.vehicle.create({
        data: {
          name: vehicleData.name,
          make: vehicleData.make,
          model: vehicleData.model,
          initialOdometer: initialOdometer > 0 ? initialOdometer : 0,
          userId: user.id
        }
      });
      console.log(`Created vehicle: ${vehicle.name} (initial odometer: ${vehicle.initialOdometer})`);
    } else {
      console.log(`Using existing vehicle: ${vehicle.name}`);
    }
    vehicleIds[carId] = vehicle.id;
  }

  // Import fuel entries
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const vehicleId = vehicleIds[entry.car_id];
    if (!vehicleId) {
      console.log(`Skipping entry - unknown car_id: ${entry.car_id}`);
      skipped++;
      continue;
    }

    const odometer = parseFloat(entry.km_total);
    const fuelAmount = parseFloat(entry.liters);
    const cost = parseFloat(entry.amount);

    if (isNaN(odometer) || isNaN(fuelAmount) || isNaN(cost)) {
      console.log(`Skipping entry - invalid data: ${entry.date}`);
      skipped++;
      continue;
    }

    // Check if entry already exists
    const existing = await prisma.fuelEntry.findFirst({
      where: {
        vehicleId,
        date: new Date(entry.date),
        odometer
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.fuelEntry.create({
      data: {
        vehicleId,
        date: new Date(entry.date),
        odometer,
        fuelAmount,
        cost,
        fullTank: true,
        gasStation: entry.gas_station || null,
        tripDistance: entry.km_trip ? parseFloat(entry.km_trip) : null,
        pricePerLiter: entry.liter_price ? parseFloat(entry.liter_price) : null,
        tyres: entry.tyres || null
      }
    });
    imported++;
  }

  console.log(`\nImport complete!`);
  console.log(`- Imported: ${imported} entries`);
  console.log(`- Skipped: ${skipped} entries`);
  console.log(`\nLogin credentials:`);
  console.log(`- Email: eelco@mileagetracker.com`);
  console.log(`- Password: mileage123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
