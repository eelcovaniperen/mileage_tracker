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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = verifyToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      include: {
        fuelEntries: {
          orderBy: { date: 'asc' }
        }
      }
    });

    let totalDistance = 0;
    let totalFuel = 0;
    let totalCost = 0;
    const monthlyData = {};
    const consumptionTrend = [];

    for (const vehicle of vehicles) {
      const entries = vehicle.fuelEntries;
      if (entries.length === 0) continue;

      totalFuel += entries.reduce((sum, e) => sum + e.fuelAmount, 0);
      totalCost += entries.reduce((sum, e) => sum + e.cost, 0);

      const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
      if (tripDistanceSum > 0) {
        totalDistance += tripDistanceSum;
      } else {
        const lastOdometer = entries[entries.length - 1].odometer;
        const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
        totalDistance += lastOdometer - firstOdometer;
      }

      for (const entry of entries) {
        const monthKey = entry.date.toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { fuel: 0, cost: 0 };
        }
        monthlyData[monthKey].fuel += entry.fuelAmount;
        monthlyData[monthKey].cost += entry.cost;
      }

      for (let i = 1; i < entries.length; i++) {
        if (entries[i].fullTank && entries[i - 1].fullTank) {
          const distance = entries[i].tripDistance || (entries[i].odometer - entries[i - 1].odometer);
          if (distance > 0 && entries[i].fuelAmount > 0) {
            const consumption = distance / entries[i].fuelAmount;
            consumptionTrend.push({
              date: entries[i].date.toISOString().slice(0, 10),
              consumption: Math.round(consumption * 100) / 100,
              vehicle: vehicle.name
            });
          }
        }
      }
    }

    const monthly = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        fuel: Math.round(data.fuel * 100) / 100,
        cost: Math.round(data.cost * 100) / 100
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const avgConsumption = totalFuel > 0 ? totalDistance / totalFuel : 0;

    res.json({
      summary: {
        totalDistance: Math.round(totalDistance),
        totalFuel: Math.round(totalFuel * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        avgConsumption: Math.round(avgConsumption * 100) / 100,
        costPerKm: totalDistance > 0
          ? Math.round((totalCost / totalDistance) * 1000) / 1000
          : 0,
        vehicleCount: vehicles.length
      },
      monthly,
      consumptionTrend: consumptionTrend.sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};
