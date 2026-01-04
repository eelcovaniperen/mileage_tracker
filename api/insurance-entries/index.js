const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = verifyToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vehicleId, startDate, endDate, cost, provider, policyNumber, coverage, notes } = req.body;

    if (!vehicleId || !startDate || !endDate || cost === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId }
    });

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
  } catch (error) {
    console.error('Create insurance entry error:', error);
    res.status(500).json({ error: 'Failed to create insurance entry' });
  }
};
