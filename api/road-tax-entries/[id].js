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
    const existing = await prisma.roadTaxEntry.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!existing || existing.vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Road tax entry not found' });
    }

    if (req.method === 'PUT') {
      const { startDate, endDate, cost, notes } = req.body;

      const entry = await prisma.roadTaxEntry.update({
        where: { id },
        data: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          cost: cost !== undefined ? parseFloat(cost) : undefined,
          notes: notes !== undefined ? (notes || null) : undefined
        }
      });

      return res.json(entry);
    }

    if (req.method === 'DELETE') {
      await prisma.roadTaxEntry.delete({
        where: { id }
      });

      return res.json({ message: 'Road tax entry deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Road tax entry error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
