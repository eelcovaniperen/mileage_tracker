const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../lib/auth');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

async function handleList(req, res, userId) {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    include: {
      fuelEntries: { orderBy: { date: 'desc' }, take: 1 }
    },
    orderBy: { createdAt: 'desc' }
  });
  return res.json(vehicles);
}

async function handleCreate(req, res, userId) {
  const { name, make, model, year, initialOdometer } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Vehicle name is required' });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      name, make, model,
      year: year ? parseInt(year) : null,
      initialOdometer: initialOdometer ? parseFloat(initialOdometer) : 0,
      userId
    }
  });

  return res.status(201).json(vehicle);
}

async function handleGet(req, res, userId, id) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, userId },
    include: {
      fuelEntries: { orderBy: { date: 'asc' } },
      maintenanceEntries: { orderBy: { date: 'desc' } },
      roadTaxEntries: { orderBy: { startDate: 'desc' } },
      insuranceEntries: { orderBy: { startDate: 'desc' } }
    }
  });

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const entries = vehicle.fuelEntries;
  const maintenanceEntries = vehicle.maintenanceEntries;
  const roadTaxEntries = vehicle.roadTaxEntries;
  const insuranceEntries = vehicle.insuranceEntries;

  let stats = {
    totalDistance: 0, totalFuel: 0, totalFuelCost: 0, avgConsumption: 0, fuelCostPerKm: 0,
    totalMaintenanceCost: 0, totalRoadTaxCost: 0, totalInsuranceCost: 0, totalDepreciationToDate: 0,
    totalOtherCost: 0, totalSpend: 0, totalCostPerKm: 0, costPerKm: 0, totalCost: 0
  };

  if (entries.length > 0) {
    stats.totalFuel = entries.reduce((sum, e) => sum + e.fuelAmount, 0);
    stats.totalFuelCost = entries.reduce((sum, e) => sum + e.cost, 0);

    const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
    if (tripDistanceSum > 0) {
      stats.totalDistance = tripDistanceSum;
    } else {
      const lastOdometer = entries[entries.length - 1].odometer;
      const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
      stats.totalDistance = lastOdometer - firstOdometer;
    }

    stats.avgConsumption = stats.totalFuel > 0 ? stats.totalDistance / stats.totalFuel : 0;
    stats.fuelCostPerKm = stats.totalDistance > 0 ? stats.totalFuelCost / stats.totalDistance : 0;
  }

  stats.totalMaintenanceCost = maintenanceEntries.reduce((sum, e) => sum + e.cost, 0);
  stats.totalRoadTaxCost = roadTaxEntries.reduce((sum, e) => sum + e.cost, 0);
  stats.totalInsuranceCost = insuranceEntries.reduce((sum, e) => sum + e.cost, 0);

  if (vehicle.depreciationYearly && vehicle.purchaseDate) {
    const purchaseDate = new Date(vehicle.purchaseDate);
    const now = new Date();
    const yearsOwned = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);
    stats.totalDepreciationToDate = vehicle.depreciationYearly * yearsOwned;
  }

  stats.totalOtherCost = stats.totalMaintenanceCost + stats.totalRoadTaxCost + stats.totalInsuranceCost + stats.totalDepreciationToDate;
  stats.totalSpend = stats.totalFuelCost + stats.totalOtherCost;
  stats.totalCostPerKm = stats.totalDistance > 0 ? stats.totalSpend / stats.totalDistance : 0;
  stats.costPerKm = stats.totalCostPerKm;
  stats.totalCost = stats.totalFuelCost;

  return res.json({ ...vehicle, stats });
}

async function handleUpdate(req, res, userId, id) {
  const {
    name, make, model, year, initialOdometer,
    purchasePrice, purchaseDate, registrationCost, otherInitialCosts,
    insuranceCostYearly, roadTaxYearly, depreciationYearly,
    financingMonthlyPayment, financingInterestRate, financingStartDate, financingEndDate, financingTotalAmount
  } = req.body;

  const existing = await prisma.vehicle.findFirst({ where: { id, userId } });

  if (!existing) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      name, make, model,
      year: year ? parseInt(year) : null,
      initialOdometer: initialOdometer ? parseFloat(initialOdometer) : existing.initialOdometer,
      purchasePrice: purchasePrice !== undefined ? (purchasePrice ? parseFloat(purchasePrice) : null) : undefined,
      purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : undefined,
      registrationCost: registrationCost !== undefined ? (registrationCost ? parseFloat(registrationCost) : null) : undefined,
      otherInitialCosts: otherInitialCosts !== undefined ? (otherInitialCosts ? parseFloat(otherInitialCosts) : null) : undefined,
      insuranceCostYearly: insuranceCostYearly !== undefined ? (insuranceCostYearly ? parseFloat(insuranceCostYearly) : null) : undefined,
      roadTaxYearly: roadTaxYearly !== undefined ? (roadTaxYearly ? parseFloat(roadTaxYearly) : null) : undefined,
      depreciationYearly: depreciationYearly !== undefined ? (depreciationYearly ? parseFloat(depreciationYearly) : null) : undefined,
      financingMonthlyPayment: financingMonthlyPayment !== undefined ? (financingMonthlyPayment ? parseFloat(financingMonthlyPayment) : null) : undefined,
      financingInterestRate: financingInterestRate !== undefined ? (financingInterestRate ? parseFloat(financingInterestRate) : null) : undefined,
      financingStartDate: financingStartDate !== undefined ? (financingStartDate ? new Date(financingStartDate) : null) : undefined,
      financingEndDate: financingEndDate !== undefined ? (financingEndDate ? new Date(financingEndDate) : null) : undefined,
      financingTotalAmount: financingTotalAmount !== undefined ? (financingTotalAmount ? parseFloat(financingTotalAmount) : null) : undefined
    }
  });

  return res.json(vehicle);
}

async function handleDelete(req, res, userId, id) {
  const existing = await prisma.vehicle.findFirst({ where: { id, userId } });

  if (!existing) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  await prisma.vehicle.delete({ where: { id } });

  return res.json({ message: 'Vehicle deleted' });
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
      // /api/vehicles
      if (req.method === 'GET') return handleList(req, res, userId);
      if (req.method === 'POST') return handleCreate(req, res, userId);
    } else {
      // /api/vehicles/:id
      if (req.method === 'GET') return handleGet(req, res, userId, id);
      if (req.method === 'PUT') return handleUpdate(req, res, userId, id);
      if (req.method === 'DELETE') return handleDelete(req, res, userId, id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vehicles error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
