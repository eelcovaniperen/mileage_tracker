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

  try {
    if (req.method === 'GET') {
      const vehicles = await prisma.vehicle.findMany({
        where: { userId },
        include: {
          fuelEntries: {
            orderBy: { date: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(vehicles);
    }

    if (req.method === 'POST') {
      const { name, make, model, year, initialOdometer } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Vehicle name is required' });
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          name,
          make,
          model,
          year: year ? parseInt(year) : null,
          initialOdometer: initialOdometer ? parseFloat(initialOdometer) : 0,
          userId
        }
      });

      return res.status(201).json(vehicle);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vehicles error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
