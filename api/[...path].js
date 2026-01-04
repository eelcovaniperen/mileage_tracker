const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateToken, verifyToken } = require('../lib/auth');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

// ============ AUTH HANDLERS ============
async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(400).json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hashedPassword, name } });
  const token = generateToken(user.id);

  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
}

async function handleMe(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

async function handleProfile(req, res, userId) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email && email !== user.email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });
    updateData.email = email;
  }
  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required to change password' });
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Current password is incorrect' });
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, name: true }
  });
  res.json(updatedUser);
}

// ============ VEHICLES HANDLERS ============
async function handleVehiclesList(req, res, userId) {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    include: { fuelEntries: { orderBy: { date: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' }
  });
  return res.json(vehicles);
}

async function handleVehicleCreate(req, res, userId) {
  const { name, make, model, year, initialOdometer } = req.body;
  if (!name) return res.status(400).json({ error: 'Vehicle name is required' });

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

async function handleVehicleGet(req, res, userId, id) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, userId },
    include: {
      fuelEntries: { orderBy: { date: 'asc' } },
      maintenanceEntries: { orderBy: { date: 'desc' } },
      roadTaxEntries: { orderBy: { startDate: 'desc' } },
      insuranceEntries: { orderBy: { startDate: 'desc' } }
    }
  });

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const entries = vehicle.fuelEntries;
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

  stats.totalMaintenanceCost = vehicle.maintenanceEntries.reduce((sum, e) => sum + e.cost, 0);
  stats.totalRoadTaxCost = vehicle.roadTaxEntries.reduce((sum, e) => sum + e.cost, 0);
  stats.totalInsuranceCost = vehicle.insuranceEntries.reduce((sum, e) => sum + e.cost, 0);

  if (vehicle.depreciationYearly && vehicle.purchaseDate) {
    const yearsOwned = (new Date() - new Date(vehicle.purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25);
    stats.totalDepreciationToDate = vehicle.depreciationYearly * yearsOwned;
  }

  stats.totalOtherCost = stats.totalMaintenanceCost + stats.totalRoadTaxCost + stats.totalInsuranceCost + stats.totalDepreciationToDate;
  stats.totalSpend = stats.totalFuelCost + stats.totalOtherCost;
  stats.totalCostPerKm = stats.totalDistance > 0 ? stats.totalSpend / stats.totalDistance : 0;
  stats.costPerKm = stats.totalCostPerKm;
  stats.totalCost = stats.totalFuelCost;

  return res.json({ ...vehicle, stats });
}

async function handleVehicleUpdate(req, res, userId, id) {
  const existing = await prisma.vehicle.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  const { name, make, model, year, initialOdometer, purchasePrice, purchaseDate, registrationCost, otherInitialCosts,
    insuranceCostYearly, roadTaxYearly, depreciationYearly, financingMonthlyPayment, financingInterestRate,
    financingStartDate, financingEndDate, financingTotalAmount } = req.body;

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

async function handleVehicleDelete(req, res, userId, id) {
  const existing = await prisma.vehicle.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
  await prisma.vehicle.delete({ where: { id } });
  return res.json({ message: 'Vehicle deleted' });
}

// ============ FUEL ENTRIES HANDLERS ============
async function handleFuelEntryCreate(req, res, userId) {
  const { vehicleId, date, odometer, fuelAmount, cost, fullTank, notes, gasStation, tripDistance, pricePerLiter, tyres } = req.body;
  if (!vehicleId || !date || !odometer || !fuelAmount || cost === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const lastEntry = await prisma.fuelEntry.findFirst({ where: { vehicleId }, orderBy: { odometer: 'desc' } });
  if (lastEntry && parseFloat(odometer) < lastEntry.odometer) {
    return res.status(400).json({ error: `Odometer reading must be at least ${lastEntry.odometer} km` });
  }

  const entry = await prisma.fuelEntry.create({
    data: {
      vehicleId, date: new Date(date), odometer: parseFloat(odometer), fuelAmount: parseFloat(fuelAmount),
      cost: parseFloat(cost), fullTank: fullTank !== false, notes, gasStation: gasStation || null,
      tripDistance: tripDistance ? parseFloat(tripDistance) : null, pricePerLiter: pricePerLiter ? parseFloat(pricePerLiter) : null,
      tyres: tyres || null
    }
  });
  res.status(201).json(entry);
}

async function handleFuelEntryUpdate(req, res, userId, id) {
  const existing = await prisma.fuelEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Fuel entry not found' });

  const { date, odometer, fuelAmount, cost, fullTank, notes, gasStation, tripDistance, pricePerLiter, tyres } = req.body;
  const entry = await prisma.fuelEntry.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined, odometer: odometer ? parseFloat(odometer) : undefined,
      fuelAmount: fuelAmount ? parseFloat(fuelAmount) : undefined, cost: cost !== undefined ? parseFloat(cost) : undefined,
      fullTank: fullTank !== undefined ? fullTank : undefined, notes,
      gasStation: gasStation !== undefined ? (gasStation || null) : undefined,
      tripDistance: tripDistance !== undefined ? (tripDistance ? parseFloat(tripDistance) : null) : undefined,
      pricePerLiter: pricePerLiter !== undefined ? (pricePerLiter ? parseFloat(pricePerLiter) : null) : undefined,
      tyres: tyres !== undefined ? (tyres || null) : undefined
    }
  });
  return res.json(entry);
}

async function handleFuelEntryDelete(req, res, userId, id) {
  const existing = await prisma.fuelEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Fuel entry not found' });
  await prisma.fuelEntry.delete({ where: { id } });
  return res.json({ message: 'Fuel entry deleted' });
}

// ============ MAINTENANCE ENTRIES HANDLERS ============
async function handleMaintenanceEntryCreate(req, res, userId) {
  const { vehicleId, date, odometer, description, cost, category, invoiceNumber, serviceProvider, notes } = req.body;
  if (!vehicleId || !date || !description || cost === undefined || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const entry = await prisma.maintenanceEntry.create({
    data: {
      vehicleId, date: new Date(date), odometer: odometer ? parseFloat(odometer) : null, description,
      cost: parseFloat(cost), category, invoiceNumber: invoiceNumber || null,
      serviceProvider: serviceProvider || null, notes: notes || null
    }
  });
  res.status(201).json(entry);
}

async function handleMaintenanceEntryUpdate(req, res, userId, id) {
  const existing = await prisma.maintenanceEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Maintenance entry not found' });

  const { date, odometer, description, cost, category, invoiceNumber, serviceProvider, notes } = req.body;
  const entry = await prisma.maintenanceEntry.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      odometer: odometer !== undefined ? (odometer ? parseFloat(odometer) : null) : undefined,
      description: description !== undefined ? description : undefined, cost: cost !== undefined ? parseFloat(cost) : undefined,
      category: category !== undefined ? category : undefined,
      invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : undefined,
      serviceProvider: serviceProvider !== undefined ? (serviceProvider || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined
    }
  });
  return res.json(entry);
}

async function handleMaintenanceEntryDelete(req, res, userId, id) {
  const existing = await prisma.maintenanceEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Maintenance entry not found' });
  await prisma.maintenanceEntry.delete({ where: { id } });
  return res.json({ message: 'Maintenance entry deleted' });
}

// ============ ROAD TAX ENTRIES HANDLERS ============
async function handleRoadTaxEntryCreate(req, res, userId) {
  const { vehicleId, startDate, endDate, cost, notes } = req.body;
  if (!vehicleId || !startDate || !endDate || cost === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const entry = await prisma.roadTaxEntry.create({
    data: { vehicleId, startDate: new Date(startDate), endDate: new Date(endDate), cost: parseFloat(cost), notes: notes || null }
  });
  res.status(201).json(entry);
}

async function handleRoadTaxEntryUpdate(req, res, userId, id) {
  const existing = await prisma.roadTaxEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Road tax entry not found' });

  const { startDate, endDate, cost, notes } = req.body;
  const entry = await prisma.roadTaxEntry.update({
    where: { id },
    data: {
      startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined,
      cost: cost !== undefined ? parseFloat(cost) : undefined, notes: notes !== undefined ? (notes || null) : undefined
    }
  });
  return res.json(entry);
}

async function handleRoadTaxEntryDelete(req, res, userId, id) {
  const existing = await prisma.roadTaxEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Road tax entry not found' });
  await prisma.roadTaxEntry.delete({ where: { id } });
  return res.json({ message: 'Road tax entry deleted' });
}

// ============ INSURANCE ENTRIES HANDLERS ============
async function handleInsuranceEntryCreate(req, res, userId) {
  const { vehicleId, startDate, endDate, cost, provider, policyNumber, coverage, notes } = req.body;
  if (!vehicleId || !startDate || !endDate || cost === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const entry = await prisma.insuranceEntry.create({
    data: {
      vehicleId, startDate: new Date(startDate), endDate: new Date(endDate), cost: parseFloat(cost),
      provider: provider || null, policyNumber: policyNumber || null, coverage: coverage || null, notes: notes || null
    }
  });
  res.status(201).json(entry);
}

async function handleInsuranceEntryUpdate(req, res, userId, id) {
  const existing = await prisma.insuranceEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Insurance entry not found' });

  const { startDate, endDate, cost, provider, policyNumber, coverage, notes } = req.body;
  const entry = await prisma.insuranceEntry.update({
    where: { id },
    data: {
      startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined,
      cost: cost !== undefined ? parseFloat(cost) : undefined,
      provider: provider !== undefined ? (provider || null) : undefined,
      policyNumber: policyNumber !== undefined ? (policyNumber || null) : undefined,
      coverage: coverage !== undefined ? (coverage || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined
    }
  });
  return res.json(entry);
}

async function handleInsuranceEntryDelete(req, res, userId, id) {
  const existing = await prisma.insuranceEntry.findUnique({ where: { id }, include: { vehicle: true } });
  if (!existing || existing.vehicle.userId !== userId) return res.status(404).json({ error: 'Insurance entry not found' });
  await prisma.insuranceEntry.delete({ where: { id } });
  return res.json({ message: 'Insurance entry deleted' });
}

// ============ MAIN ROUTER ============
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pathParts = req.query.path || [];
    const [resource, idOrAction] = pathParts;

    // Auth routes (no auth required for login/register)
    if (resource === 'auth') {
      if (idOrAction === 'login') return handleLogin(req, res);
      if (idOrAction === 'register') return handleRegister(req, res);

      // Protected auth routes
      const userId = verifyToken(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (idOrAction === 'me') return handleMe(req, res, userId);
      if (idOrAction === 'profile') return handleProfile(req, res, userId);
      return res.status(404).json({ error: 'Not found' });
    }

    // All other routes require authentication
    const userId = verifyToken(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Vehicles
    if (resource === 'vehicles') {
      if (!idOrAction) {
        if (req.method === 'GET') return handleVehiclesList(req, res, userId);
        if (req.method === 'POST') return handleVehicleCreate(req, res, userId);
      } else {
        if (req.method === 'GET') return handleVehicleGet(req, res, userId, idOrAction);
        if (req.method === 'PUT') return handleVehicleUpdate(req, res, userId, idOrAction);
        if (req.method === 'DELETE') return handleVehicleDelete(req, res, userId, idOrAction);
      }
    }

    // Fuel Entries
    if (resource === 'fuel-entries') {
      if (!idOrAction) {
        if (req.method === 'POST') return handleFuelEntryCreate(req, res, userId);
      } else {
        if (req.method === 'PUT') return handleFuelEntryUpdate(req, res, userId, idOrAction);
        if (req.method === 'DELETE') return handleFuelEntryDelete(req, res, userId, idOrAction);
      }
    }

    // Maintenance Entries
    if (resource === 'maintenance-entries') {
      if (!idOrAction) {
        if (req.method === 'POST') return handleMaintenanceEntryCreate(req, res, userId);
      } else {
        if (req.method === 'PUT') return handleMaintenanceEntryUpdate(req, res, userId, idOrAction);
        if (req.method === 'DELETE') return handleMaintenanceEntryDelete(req, res, userId, idOrAction);
      }
    }

    // Road Tax Entries
    if (resource === 'road-tax-entries') {
      if (!idOrAction) {
        if (req.method === 'POST') return handleRoadTaxEntryCreate(req, res, userId);
      } else {
        if (req.method === 'PUT') return handleRoadTaxEntryUpdate(req, res, userId, idOrAction);
        if (req.method === 'DELETE') return handleRoadTaxEntryDelete(req, res, userId, idOrAction);
      }
    }

    // Insurance Entries
    if (resource === 'insurance-entries') {
      if (!idOrAction) {
        if (req.method === 'POST') return handleInsuranceEntryCreate(req, res, userId);
      } else {
        if (req.method === 'PUT') return handleInsuranceEntryUpdate(req, res, userId, idOrAction);
        if (req.method === 'DELETE') return handleInsuranceEntryDelete(req, res, userId, idOrAction);
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
