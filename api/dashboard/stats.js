const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../lib/auth');

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://mileagetracker-lac.vercel.app',
  'https://drivetotal.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

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
        },
        maintenanceEntries: true,
        roadTaxEntries: true,
        insuranceEntries: true
      }
    });

    // Calculate date thresholds
    const now = new Date();
    const t12mDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    const currentYearStart = new Date(currentYear, 0, 1);
    const previousYearStart = new Date(previousYear, 0, 1);
    const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59);

    let totalDistance = 0;
    let totalFuel = 0;
    let totalCost = 0;
    let t12mDistance = 0;
    let t12mFuel = 0;
    let t12mCost = 0;
    const monthlyData = {};
    const consumptionTrend = [];
    const vehicleStats = [];
    const fuelPriceTrend = [];

    // Year-over-year tracking
    let currentYearData = { distance: 0, fuel: 0, cost: 0, entries: 0 };
    let previousYearData = { distance: 0, fuel: 0, cost: 0, entries: 0 };

    // Cost breakdown totals
    let totalFuelCost = 0;
    let totalMaintenanceCost = 0;
    let totalRoadTaxCost = 0;
    let totalInsuranceCost = 0;
    let totalFinancingCost = 0;
    let totalDepreciationCost = 0;

    for (const vehicle of vehicles) {
      const entries = vehicle.fuelEntries;

      // Calculate all cost components for this vehicle
      const vehicleFuelCost = entries.reduce((sum, e) => sum + e.cost, 0);
      const vehicleMaintenanceCost = vehicle.maintenanceEntries.reduce((sum, e) => sum + e.cost, 0);
      const vehicleRoadTaxCost = vehicle.roadTaxEntries.reduce((sum, e) => sum + e.cost, 0);
      const vehicleInsuranceCost = vehicle.insuranceEntries.reduce((sum, e) => sum + e.cost, 0);

      // Calculate financing cost
      let vehicleFinancingCost = 0;
      if (vehicle.financingTotalAmount) {
        vehicleFinancingCost = vehicle.financingTotalAmount;
      } else if (vehicle.financingMonthlyPayment && vehicle.financingStartDate) {
        const startDate = new Date(vehicle.financingStartDate);
        const endDate = vehicle.financingEndDate ? new Date(vehicle.financingEndDate) : new Date();
        const months = Math.max(0, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()));
        vehicleFinancingCost = vehicle.financingMonthlyPayment * months;
      }

      // Calculate depreciation
      let vehicleDepreciation = 0;
      if (vehicle.soldDate && vehicle.purchasePrice) {
        vehicleDepreciation = vehicle.purchasePrice - (vehicle.soldPrice || 0);
      } else if (vehicle.depreciationYearly && vehicle.purchaseDate) {
        const yearsOwned = (new Date() - new Date(vehicle.purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25);
        vehicleDepreciation = vehicle.depreciationYearly * yearsOwned;
      }

      // Running costs = road tax + insurance + financing
      const vehicleRunningCosts = vehicleRoadTaxCost + vehicleInsuranceCost + vehicleFinancingCost;

      // Total cost = fuel + maintenance + depreciation + running costs
      const vehicleTotalCost = vehicleFuelCost + vehicleMaintenanceCost + vehicleDepreciation + vehicleRunningCosts;

      // Net cost = total cost - sale proceeds
      const vehicleNetCost = vehicle.soldPrice ? vehicleTotalCost - vehicle.soldPrice : vehicleTotalCost;

      // Accumulate cost breakdown totals
      totalFuelCost += vehicleFuelCost;
      totalMaintenanceCost += vehicleMaintenanceCost;
      totalRoadTaxCost += vehicleRoadTaxCost;
      totalInsuranceCost += vehicleInsuranceCost;
      totalFinancingCost += vehicleFinancingCost;
      totalDepreciationCost += vehicleDepreciation;

      if (entries.length === 0) {
        vehicleStats.push({
          id: vehicle.id,
          totalDistance: 0,
          avgConsumption: 0,
          costPerKm: 0,
          totalCost: Math.round(vehicleTotalCost * 100) / 100,
          totalCostPerKm: 0
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
      const vehicleFuelCostPerKm = vehicleDistance > 0 ? vehicleCost / vehicleDistance : 0;
      const vehicleTotalCostPerKm = vehicleDistance > 0 ? vehicleNetCost / vehicleDistance : 0;

      vehicleStats.push({
        id: vehicle.id,
        totalDistance: Math.round(vehicleDistance),
        avgConsumption: Math.round(vehicleAvgConsumption * 100) / 100,
        costPerKm: Math.round(vehicleFuelCostPerKm * 1000) / 1000,
        totalCost: Math.round(vehicleTotalCost * 100) / 100,
        totalCostPerKm: Math.round(vehicleTotalCostPerKm * 1000) / 1000
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

        // Year-over-year tracking
        const entryDate = new Date(entry.date);
        if (entryDate >= currentYearStart) {
          currentYearData.fuel += entry.fuelAmount;
          currentYearData.cost += entry.cost;
          currentYearData.entries++;
          if (entry.tripDistance) currentYearData.distance += entry.tripDistance;
        } else if (entryDate >= previousYearStart && entryDate <= previousYearEnd) {
          previousYearData.fuel += entry.fuelAmount;
          previousYearData.cost += entry.cost;
          previousYearData.entries++;
          if (entry.tripDistance) previousYearData.distance += entry.tripDistance;
        }

        // Fuel price trend (only if pricePerLiter is recorded)
        if (entry.pricePerLiter) {
          fuelPriceTrend.push({
            date: entry.date.toISOString().slice(0, 10),
            price: Math.round(entry.pricePerLiter * 1000) / 1000,
            vehicle: vehicle.name
          });
        }
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

    // Calculate year-over-year comparison
    const currentYearAvgConsumption = currentYearData.fuel > 0 ? currentYearData.distance / currentYearData.fuel : 0;
    const previousYearAvgConsumption = previousYearData.fuel > 0 ? previousYearData.distance / previousYearData.fuel : 0;

    const yearOverYear = {
      currentYear: {
        year: currentYear,
        distance: Math.round(currentYearData.distance),
        fuel: Math.round(currentYearData.fuel * 100) / 100,
        cost: Math.round(currentYearData.cost * 100) / 100,
        avgConsumption: Math.round(currentYearAvgConsumption * 100) / 100,
        entries: currentYearData.entries
      },
      previousYear: {
        year: previousYear,
        distance: Math.round(previousYearData.distance),
        fuel: Math.round(previousYearData.fuel * 100) / 100,
        cost: Math.round(previousYearData.cost * 100) / 100,
        avgConsumption: Math.round(previousYearAvgConsumption * 100) / 100,
        entries: previousYearData.entries
      },
      changes: {
        distance: previousYearData.distance > 0
          ? Math.round(((currentYearData.distance - previousYearData.distance) / previousYearData.distance) * 100)
          : null,
        cost: previousYearData.cost > 0
          ? Math.round(((currentYearData.cost - previousYearData.cost) / previousYearData.cost) * 100)
          : null,
        consumption: previousYearAvgConsumption > 0
          ? Math.round(((currentYearAvgConsumption - previousYearAvgConsumption) / previousYearAvgConsumption) * 100)
          : null
      }
    };

    // Cost breakdown for pie chart
    const totalAllCosts = totalFuelCost + totalMaintenanceCost + totalRoadTaxCost + totalInsuranceCost + totalFinancingCost + totalDepreciationCost;
    const costBreakdown = [
      { name: 'Fuel', value: Math.round(totalFuelCost * 100) / 100, color: '#3b82f6' },
      { name: 'Maintenance', value: Math.round(totalMaintenanceCost * 100) / 100, color: '#f59e0b' },
      { name: 'Road Tax', value: Math.round(totalRoadTaxCost * 100) / 100, color: '#10b981' },
      { name: 'Insurance', value: Math.round(totalInsuranceCost * 100) / 100, color: '#8b5cf6' },
      { name: 'Financing', value: Math.round(totalFinancingCost * 100) / 100, color: '#ef4444' },
      { name: 'Depreciation', value: Math.round(totalDepreciationCost * 100) / 100, color: '#6b7280' }
    ].filter(item => item.value > 0);

    // Calculate projected annual costs based on T12M data
    const monthsElapsedThisYear = now.getMonth() + 1;
    const projectedAnnualCosts = {
      fuel: monthsElapsedThisYear > 0 ? Math.round((currentYearData.cost / monthsElapsedThisYear) * 12) : 0,
      distance: monthsElapsedThisYear > 0 ? Math.round((currentYearData.distance / monthsElapsedThisYear) * 12) : 0,
      // Use T12M for more accurate projection if available
      basedOnT12M: t12mCost > 0 ? {
        cost: Math.round(t12mCost),
        distance: Math.round(t12mDistance)
      } : null
    };

    // Vehicle comparison data
    const vehicleComparison = vehicles.map(v => {
      const vStats = vehicleStats.find(vs => vs.id === v.id) || {};
      return {
        id: v.id,
        name: v.name,
        make: v.make,
        model: v.model,
        year: v.year,
        photo: v.photo,
        status: v.soldDate ? 'sold' : 'active',
        stats: {
          totalDistance: vStats.totalDistance || 0,
          avgConsumption: vStats.avgConsumption || 0,
          fuelCostPerKm: vStats.costPerKm || 0,
          totalCost: vStats.totalCost || 0,
          totalCostPerKm: vStats.totalCostPerKm || 0
        }
      };
    });

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
      yearOverYear,
      costBreakdown,
      projectedAnnualCosts,
      vehicleComparison,
      fuelPriceTrend: fuelPriceTrend.sort((a, b) => a.date.localeCompare(b.date)),
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
