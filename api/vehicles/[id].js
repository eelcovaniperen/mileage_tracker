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

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id, userId },
        include: {
          fuelEntries: {
            orderBy: { date: 'asc' }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Calculate stats
      const entries = vehicle.fuelEntries;
      let stats = {
        totalDistance: 0,
        totalFuel: 0,
        totalCost: 0,
        avgConsumption: 0,
        costPerKm: 0
      };

      if (entries.length > 0) {
        stats.totalFuel = entries.reduce((sum, e) => sum + e.fuelAmount, 0);
        stats.totalCost = entries.reduce((sum, e) => sum + e.cost, 0);

        const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
        if (tripDistanceSum > 0) {
          stats.totalDistance = tripDistanceSum;
        } else {
          const lastOdometer = entries[entries.length - 1].odometer;
          const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
          stats.totalDistance = lastOdometer - firstOdometer;
        }

        stats.avgConsumption = stats.totalFuel > 0 ? stats.totalDistance / stats.totalFuel : 0;
        stats.costPerKm = stats.totalDistance > 0 ? stats.totalCost / stats.totalDistance : 0;
      }

      return res.json({ ...vehicle, stats });
    }

    if (req.method === 'PUT') {
      const { name, make, model, year, initialOdometer } = req.body;

      const existing = await prisma.vehicle.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          name,
          make,
          model,
          year: year ? parseInt(year) : null,
          initialOdometer: initialOdometer ? parseFloat(initialOdometer) : existing.initialOdometer
        }
      });

      return res.json(vehicle);
    }

    if (req.method === 'DELETE') {
      const existing = await prisma.vehicle.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      await prisma.vehicle.delete({
        where: { id }
      });

      return res.json({ message: 'Vehicle deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vehicle error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
