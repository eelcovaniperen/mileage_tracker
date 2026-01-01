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

    // Calculate T12M date threshold
    const now = new Date();
    const t12mDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    let totalDistance = 0;
    let totalFuel = 0;
    let totalCost = 0;
    let t12mDistance = 0;
    let t12mFuel = 0;
    let t12mCost = 0;
    const monthlyData = {};
    const consumptionTrend = [];
    const vehicleStats = [];

    for (const vehicle of vehicles) {
      const entries = vehicle.fuelEntries;
      if (entries.length === 0) {
        vehicleStats.push({
          id: vehicle.id,
          totalDistance: 0,
          avgConsumption: 0,
          costPerKm: 0
        });
        continue;
      }

      // All-time stats
      const vehicleFuel = entries.reduce((sum, e) => sum + e.fuelAmount, 0);
      const vehicleCost = entries.reduce((sum, e) => sum + e.cost, 0);
      totalFuel += vehicleFuel;
      totalCost += vehicleCost;

      const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
      let vehicleDistance = 0;
      if (tripDistanceSum > 0) {
        vehicleDistance = tripDistanceSum;
      } else {
        const lastOdometer = entries[entries.length - 1].odometer;
        const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
        vehicleDistance = lastOdometer - firstOdometer;
      }
      totalDistance += vehicleDistance;

      // Calculate vehicle-level stats
      const vehicleAvgConsumption = vehicleFuel > 0 ? vehicleDistance / vehicleFuel : 0;
      const vehicleCostPerKm = vehicleDistance > 0 ? vehicleCost / vehicleDistance : 0;
      vehicleStats.push({
        id: vehicle.id,
        totalDistance: Math.round(vehicleDistance),
        avgConsumption: Math.round(vehicleAvgConsumption * 100) / 100,
        costPerKm: Math.round(vehicleCostPerKm * 1000) / 1000
      });

      // T12M stats
      const t12mEntries = entries.filter(e => e.date >= t12mDate);
      if (t12mEntries.length > 0) {
        t12mFuel += t12mEntries.reduce((sum, e) => sum + e.fuelAmount, 0);
        t12mCost += t12mEntries.reduce((sum, e) => sum + e.cost, 0);

        const t12mTripDistanceSum = t12mEntries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
        if (t12mTripDistanceSum > 0) {
          t12mDistance += t12mTripDistanceSum;
        } else if (t12mEntries.length >= 2) {
          t12mDistance += t12mEntries[t12mEntries.length - 1].odometer - t12mEntries[0].odometer;
        }
      }

      // Monthly data for all entries
      for (const entry of entries) {
        const monthKey = entry.date.toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { fuel: 0, cost: 0, distance: 0, entries: [] };
        }
        monthlyData[monthKey].fuel += entry.fuelAmount;
        monthlyData[monthKey].cost += entry.cost;
        if (entry.tripDistance) {
          monthlyData[monthKey].distance += entry.tripDistance;
        }
        monthlyData[monthKey].entries.push(entry);
      }

      // Consumption trend
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

    // Calculate monthly stats
    const monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => {
        let distance = data.distance;
        if (distance === 0 && data.entries.length >= 2) {
          const sortedEntries = data.entries.sort((a, b) => a.odometer - b.odometer);
          distance = sortedEntries[sortedEntries.length - 1].odometer - sortedEntries[0].odometer;
        }

        return {
          month,
          fuel: Math.round(data.fuel * 100) / 100,
          cost: Math.round(data.cost * 100) / 100,
          distance: Math.round(distance)
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate rolling T12M averages for each month
    // For each month, calculate the trailing 12 months' totals ending at that month
    const t12mRollingTrend = [];
    for (let i = 0; i < monthlyTrend.length; i++) {
      const currentMonth = monthlyTrend[i].month;

      // Get the 12 months ending at this month (inclusive)
      const startIndex = Math.max(0, i - 11);
      const monthsInWindow = monthlyTrend.slice(startIndex, i + 1);

      const windowFuel = monthsInWindow.reduce((sum, m) => sum + m.fuel, 0);
      const windowCost = monthsInWindow.reduce((sum, m) => sum + m.cost, 0);
      const windowDistance = monthsInWindow.reduce((sum, m) => sum + m.distance, 0);

      const avgConsumption = windowFuel > 0 && windowDistance > 0 ? windowDistance / windowFuel : 0;
      const costPerKm = windowDistance > 0 ? windowCost / windowDistance : 0;

      t12mRollingTrend.push({
        month: currentMonth,
        fuel: Math.round(windowFuel * 100) / 100,
        cost: Math.round(windowCost * 100) / 100,
        distance: windowDistance,
        avgConsumption: Math.round(avgConsumption * 100) / 100,
        costPerKm: Math.round(costPerKm * 1000) / 1000,
        monthsIncluded: monthsInWindow.length
      });
    }

    // Get the last 24 months for the rolling trend chart (to show more data points)
    const t12mTrendData = t12mRollingTrend.slice(-24);

    const avgConsumption = totalFuel > 0 ? totalDistance / totalFuel : 0;
    const t12mAvgConsumption = t12mFuel > 0 ? t12mDistance / t12mFuel : 0;

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
      t12m: {
        totalDistance: Math.round(t12mDistance),
        totalFuel: Math.round(t12mFuel * 100) / 100,
        totalCost: Math.round(t12mCost * 100) / 100,
        avgConsumption: Math.round(t12mAvgConsumption * 100) / 100,
        costPerKm: t12mDistance > 0
          ? Math.round((t12mCost / t12mDistance) * 1000) / 1000
          : 0
      },
      vehicleStats,
      monthly: monthlyTrend,
      t12mTrend: t12mTrendData,
      consumptionTrend: consumptionTrend.sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};
