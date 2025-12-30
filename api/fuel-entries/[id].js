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
    const existing = await prisma.fuelEntry.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!existing || existing.vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Fuel entry not found' });
    }

    if (req.method === 'PUT') {
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

    if (req.method === 'DELETE') {
      await prisma.fuelEntry.delete({
        where: { id }
      });

      return res.json({ message: 'Fuel entry deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Fuel entry error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
