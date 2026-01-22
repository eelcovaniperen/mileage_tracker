const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateToken, verifyToken } = require('../lib/auth');
const { checkAuthRateLimit, checkApiRateLimit, getClientIp } = require('../lib/rateLimit');
const { validateEmail, validatePassword, sanitizeString } = require('../lib/validation');

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://mileagetracker-lac.vercel.app',
  'https://drivetotal.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  // Check if origin is allowed (also allow same-origin requests with no origin header)
  if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Accept-Version, Content-Length, Content-Type, Authorization');
}

// ============ AUTH HANDLERS ============
async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    // Constant-time comparison to prevent timing attacks
    await bcrypt.compare(password, '$2a$12$dummy.hash.for.timing.attack.prevention');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name } = req.body;

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  // Sanitize name
  const sanitizedName = sanitizeString(name, 100);

  // Check for existing user - use generic error to prevent enumeration
  const existingUser = await prisma.user.findUnique({ where: { email: emailValidation.normalized } });
  if (existingUser) {
    // Return same response time to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    return res.status(400).json({ error: 'Unable to create account. Please try a different email.' });
  }

  const hashedPassword = await bcrypt.hash(password, 12); // Increased cost factor
  const user = await prisma.user.create({
    data: {
      email: emailValidation.normalized,
      password: hashedPassword,
      name: sanitizedName
    }
  });
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

  // Sanitize and validate name
  if (name !== undefined) {
    updateData.name = sanitizeString(name, 100);
  }

  // Validate and update email
  if (email && email !== user.email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }
    const existingUser = await prisma.user.findUnique({ where: { email: emailValidation.normalized } });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });
    updateData.email = emailValidation.normalized;
  }

  // Validate and update password
  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required to change password' });

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Current password is incorrect' });
    updateData.password = await bcrypt.hash(newPassword, 12);
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
  const { name, make, model, year, initialOdometer, photo } = req.body;
  if (!name) return res.status(400).json({ error: 'Vehicle name is required' });

  const vehicle = await prisma.vehicle.create({
    data: {
      name, make, model,
      year: year ? parseInt(year) : null,
      initialOdometer: initialOdometer ? parseFloat(initialOdometer) : 0,
      photo: photo || null,
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

  // Determine vehicle status
  const status = vehicle.soldDate ? 'inactive' : 'active';

  const entries = vehicle.fuelEntries;
  let stats = {
    totalDistance: 0, totalFuel: 0, totalFuelCost: 0, avgConsumption: 0, fuelCostPerKm: 0,
    totalMaintenanceCost: 0, totalRoadTaxCost: 0, totalInsuranceCost: 0, totalFinancingCost: 0,
    expectedDepreciation: 0, actualDepreciation: 0, totalDepreciationToDate: 0,
    runningCosts: 0, totalCost: 0, netCost: 0, totalCostPerKm: 0
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

  // Calculate financing cost
  if (vehicle.financingTotalAmount) {
    stats.totalFinancingCost = vehicle.financingTotalAmount;
  } else if (vehicle.financingMonthlyPayment && vehicle.financingStartDate) {
    const startDate = new Date(vehicle.financingStartDate);
    const endDate = vehicle.financingEndDate ? new Date(vehicle.financingEndDate) : new Date();
    const months = Math.max(0, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()));
    stats.totalFinancingCost = vehicle.financingMonthlyPayment * months;
  }

  // Calculate depreciation
  if (vehicle.soldDate && vehicle.purchasePrice) {
    // Actual depreciation when sold = purchase price - sale price
    stats.actualDepreciation = vehicle.purchasePrice - (vehicle.soldPrice || 0);
    stats.totalDepreciationToDate = stats.actualDepreciation;
  } else if (vehicle.depreciationYearly && vehicle.purchaseDate) {
    // Expected depreciation based on yearly rate
    const yearsOwned = (new Date() - new Date(vehicle.purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25);
    stats.expectedDepreciation = vehicle.depreciationYearly * yearsOwned;
    stats.totalDepreciationToDate = stats.expectedDepreciation;
  }

  // Running costs = road tax + insurance + financing (fixed/recurring costs)
  stats.runningCosts = stats.totalRoadTaxCost + stats.totalInsuranceCost + stats.totalFinancingCost;

  // Total cost = ALL cost components (fuel + maintenance + depreciation + running costs)
  stats.totalCost = stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalDepreciationToDate + stats.runningCosts;

  // Net cost = total cost (depreciation already accounts for sale price)
  stats.netCost = stats.totalCost;

  // Cost per km based on net cost
  stats.totalCostPerKm = stats.totalDistance > 0 ? stats.netCost / stats.totalDistance : 0;

  return res.json({ ...vehicle, status, stats });
}

async function handleVehicleUpdate(req, res, userId, id) {
  const existing = await prisma.vehicle.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  const { name, make, model, year, initialOdometer, photo, purchasePrice, purchaseDate, registrationCost, otherInitialCosts,
    insuranceCostYearly, roadTaxYearly, depreciationYearly, financingMonthlyPayment, financingInterestRate,
    financingStartDate, financingEndDate, financingTotalAmount, soldDate, soldPrice } = req.body;

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      name, make, model,
      year: year ? parseInt(year) : null,
      initialOdometer: initialOdometer ? parseFloat(initialOdometer) : existing.initialOdometer,
      photo: photo !== undefined ? (photo || null) : undefined,
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
      financingTotalAmount: financingTotalAmount !== undefined ? (financingTotalAmount ? parseFloat(financingTotalAmount) : null) : undefined,
      soldDate: soldDate !== undefined ? (soldDate ? new Date(soldDate) : null) : undefined,
      soldPrice: soldPrice !== undefined ? (soldPrice ? parseFloat(soldPrice) : null) : undefined
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

// ============ RECENT ACTIVITY HANDLER ============
async function handleRecentActivity(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Parse query params from URL
  const urlParams = new URL(req.url, 'http://localhost').searchParams;
  const limit = parseInt(urlParams.get('limit')) || 50;
  const typeFilter = urlParams.get('type'); // 'fuel', 'maintenance', or null for all

  // Get all vehicles for the user
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    select: { id: true, name: true, photo: true }
  });

  const vehicleMap = {};
  vehicles.forEach(v => { vehicleMap[v.id] = v; });
  const vehicleIds = vehicles.map(v => v.id);

  // Fetch entries based on filter
  const fuelEntries = (!typeFilter || typeFilter === 'fuel')
    ? await prisma.fuelEntry.findMany({
        where: { vehicleId: { in: vehicleIds } },
        orderBy: { date: 'desc' },
        take: limit
      })
    : [];

  const maintenanceEntries = (!typeFilter || typeFilter === 'maintenance')
    ? await prisma.maintenanceEntry.findMany({
        where: { vehicleId: { in: vehicleIds } },
        orderBy: { date: 'desc' },
        take: limit
      })
    : [];

  // Combine and format entries
  const activities = [
    ...fuelEntries.map(e => ({
      id: e.id,
      type: 'fuel',
      date: e.date,
      createdAt: e.createdAt,
      cost: e.cost,
      description: `${e.fuelAmount.toFixed(1)}L at ${e.gasStation || 'Unknown'}`,
      details: { odometer: e.odometer, fuelAmount: e.fuelAmount, pricePerLiter: e.pricePerLiter },
      vehicle: vehicleMap[e.vehicleId]
    })),
    ...maintenanceEntries.map(e => ({
      id: e.id,
      type: 'maintenance',
      date: e.date,
      createdAt: e.createdAt,
      cost: e.cost,
      description: e.description,
      details: { category: e.category, odometer: e.odometer },
      vehicle: vehicleMap[e.vehicleId]
    }))
  ];

  // Sort by event date descending (most recent first)
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  const limitedActivities = activities.slice(0, limit);

  return res.json(limitedActivities);
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
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientIp = getClientIp(req);

  try {
    // Parse path from URL (e.g., /api/auth/login -> ['auth', 'login'])
    const url = req.url.split('?')[0];
    const pathParts = url.replace(/^\/api\//, '').split('/').filter(Boolean);
    const [resource, idOrAction] = pathParts;

    // Auth routes (no auth required for login/register)
    if (resource === 'auth') {
      // Apply stricter rate limiting for auth endpoints
      if (idOrAction === 'login' || idOrAction === 'register') {
        const rateLimit = checkAuthRateLimit(clientIp);
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000));

        if (!rateLimit.success) {
          return res.status(429).json({
            error: 'Too many attempts. Please try again later.',
            retryAfter: Math.ceil(rateLimit.resetIn / 1000)
          });
        }
      }

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

    // Apply general rate limiting for authenticated requests
    const apiRateLimit = checkApiRateLimit(userId);
    res.setHeader('X-RateLimit-Remaining', apiRateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(apiRateLimit.resetIn / 1000));

    if (!apiRateLimit.success) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil(apiRateLimit.resetIn / 1000)
      });
    }

    // Recent Activity
    if (resource === 'recent-activity') {
      if (req.method === 'GET') return handleRecentActivity(req, res, userId);
    }

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
