const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../lib/auth');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

async function handleCreate(req, res, userId) {
  const { vehicleId, startDate, endDate, cost, provider, policyNumber, coverage, notes } = req.body;

  if (!vehicleId || !startDate || !endDate || cost === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const entry = await prisma.insuranceEntry.create({
    data: {
      vehicleId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      cost: parseFloat(cost),
      provider: provider || null,
      policyNumber: policyNumber || null,
      coverage: coverage || null,
      notes: notes || null
    }
  });

  res.status(201).json(entry);
}

async function handleUpdate(req, res, userId, id) {
  const existing = await prisma.insuranceEntry.findUnique({
    where: { id },
    include: { vehicle: true }
  });

  if (!existing || existing.vehicle.userId !== userId) {
    return res.status(404).json({ error: 'Insurance entry not found' });
  }

  const { startDate, endDate, cost, provider, policyNumber, coverage, notes } = req.body;

  const entry = await prisma.insuranceEntry.update({
    where: { id },
    data: {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      cost: cost !== undefined ? parseFloat(cost) : undefined,
      provider: provider !== undefined ? (provider || null) : undefined,
      policyNumber: policyNumber !== undefined ? (policyNumber || null) : undefined,
      coverage: coverage !== undefined ? (coverage || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined
    }
  });

  return res.json(entry);
}

async function handleDelete(req, res, userId, id) {
  const existing = await prisma.insuranceEntry.findUnique({
    where: { id },
    include: { vehicle: true }
  });

  if (!existing || existing.vehicle.userId !== userId) {
    return res.status(404).json({ error: 'Insurance entry not found' });
  }

  await prisma.insuranceEntry.delete({ where: { id } });

  return res.json({ message: 'Insurance entry deleted' });
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
      if (req.method === 'POST') return handleCreate(req, res, userId);
    } else {
      if (req.method === 'PUT') return handleUpdate(req, res, userId, id);
      if (req.method === 'DELETE') return handleDelete(req, res, userId, id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Insurance entry error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
