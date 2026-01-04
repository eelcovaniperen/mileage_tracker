const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../lib/auth');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

async function handleCreate(req, res, userId) {
  const { vehicleId, date, odometer, description, cost, category, invoiceNumber, serviceProvider, notes } = req.body;

  if (!vehicleId || !date || !description || cost === undefined || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const entry = await prisma.maintenanceEntry.create({
    data: {
      vehicleId,
      date: new Date(date),
      odometer: odometer ? parseFloat(odometer) : null,
      description,
      cost: parseFloat(cost),
      category,
      invoiceNumber: invoiceNumber || null,
      serviceProvider: serviceProvider || null,
      notes: notes || null
    }
  });

  res.status(201).json(entry);
}

async function handleUpdate(req, res, userId, id) {
  const existing = await prisma.maintenanceEntry.findUnique({
    where: { id },
    include: { vehicle: true }
  });

  if (!existing || existing.vehicle.userId !== userId) {
    return res.status(404).json({ error: 'Maintenance entry not found' });
  }

  const { date, odometer, description, cost, category, invoiceNumber, serviceProvider, notes } = req.body;

  const entry = await prisma.maintenanceEntry.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      odometer: odometer !== undefined ? (odometer ? parseFloat(odometer) : null) : undefined,
      description: description !== undefined ? description : undefined,
      cost: cost !== undefined ? parseFloat(cost) : undefined,
      category: category !== undefined ? category : undefined,
      invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : undefined,
      serviceProvider: serviceProvider !== undefined ? (serviceProvider || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined
    }
  });

  return res.json(entry);
}

async function handleDelete(req, res, userId, id) {
  const existing = await prisma.maintenanceEntry.findUnique({
    where: { id },
    include: { vehicle: true }
  });

  if (!existing || existing.vehicle.userId !== userId) {
    return res.status(404).json({ error: 'Maintenance entry not found' });
  }

  await prisma.maintenanceEntry.delete({ where: { id } });

  return res.json({ message: 'Maintenance entry deleted' });
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
    console.error('Maintenance entry error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
