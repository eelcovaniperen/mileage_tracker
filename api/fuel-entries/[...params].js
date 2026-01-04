const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../lib/auth');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

async function handleCreate(req, res, userId) {
  const { vehicleId, date, odometer, fuelAmount, cost, fullTank, notes, gasStation, tripDistance, pricePerLiter, tyres } = req.body;

  if (!vehicleId || !date || !odometer || !fuelAmount || cost === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const lastEntry = await prisma.fuelEntry.findFirst({
    where: { vehicleId },
    orderBy: { odometer: 'desc' }
  });

  if (lastEntry && parseFloat(odometer) < lastEntry.odometer) {
    return res.status(400).json({ error: `Odometer reading must be at least ${lastEntry.odometer} km` });
  }

  const entry = await prisma.fuelEntry.create({
    data: {
      vehicleId,
      date: new Date(date),
      odometer: parseFloat(odometer),
      fuelAmount: parseFloat(fuelAmount),
      cost: parseFloat(cost),
      fullTank: fullTank !== false,
      notes,
      gasStation: gasStation || null,
      tripDistance: tripDistance ? parseFloat(tripDistance) : null,
      pricePerLiter: pricePerLiter ? parseFloat(pricePerLiter) : null,
      tyres: tyres || null
    }
  });

  res.status(201).json(entry);
}

async function handleUpdate(req, res, userId, id) {
  const existing = await prisma.fuelEntry.findUnique({
    where: { id },
    include: { vehicle: true }
  });

  if (!existing || existing.vehicle.userId !== userId) {
    return res.status(404).json({ error: 'Fuel entry not found' });
  }

  const { date, odometer, fuelAmount, cost, fullTank, notes, gasStation, tripDistance, pricePerLiter, tyres } = req.body;

  const entry = await prisma.fuelEntry.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      odometer: odometer ? parseFloat(odometer) : undefined,
      fuelAmount: fuelAmount ? parseFloat(fuelAmount) : undefined,
      cost: cost !== undefined ? parseFloat(cost) : undefined,
      fullTank: fullTank !== undefined ? fullTank : undefined,
      notes,
      gasStation: gasStation !== undefined ? (gasStation || null) : undefined,
      tripDistance: tripDistance !== undefined ? (tripDistance ? parseFloat(tripDistance) : null) : undefined,
      pricePerLiter: pricePerLiter !== undefined ? (pricePerLiter ? parseFloat(pricePerLiter) : null) : undefined,
      tyres: tyres !== undefined ? (tyres || null) : undefined
    }
  });

  return res.json(entry);
}

async function handleDelete(req, res, userId, id) {
  const existing = await prisma.fuelEntry.findUnique({
    where: { id },
    include: { vehicle: true }
  });

  if (!existing || existing.vehicle.userId !== userId) {
    return res.status(404).json({ error: 'Fuel entry not found' });
  }

  await prisma.fuelEntry.delete({ where: { id } });

  return res.json({ message: 'Fuel entry deleted' });
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = verifyToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const params = req.query.params || [];
    const id = Array.isArray(params) ? params[0] : params;

    if (!id) {
      // /api/fuel-entries (POST only)
      if (req.method === 'POST') return handleCreate(req, res, userId);
    } else {
      // /api/fuel-entries/:id
      if (req.method === 'PUT') return handleUpdate(req, res, userId, id);
      if (req.method === 'DELETE') return handleDelete(req, res, userId, id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Fuel entry error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
