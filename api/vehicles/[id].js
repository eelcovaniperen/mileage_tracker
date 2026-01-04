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
          },
          maintenanceEntries: {
            orderBy: { date: 'desc' }
          },
          roadTaxEntries: {
            orderBy: { startDate: 'desc' }
          },
          insuranceEntries: {
            orderBy: { startDate: 'desc' }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Calculate stats
      const entries = vehicle.fuelEntries;
      const maintenanceEntries = vehicle.maintenanceEntries;
      const roadTaxEntries = vehicle.roadTaxEntries;
      const insuranceEntries = vehicle.insuranceEntries;

      let stats = {
        // Fuel stats
        totalDistance: 0,
        totalFuel: 0,
        totalFuelCost: 0,
        avgConsumption: 0,
        fuelCostPerKm: 0,
        // Other costs
        totalMaintenanceCost: 0,
        totalRoadTaxCost: 0,
        totalInsuranceCost: 0,
        totalDepreciationToDate: 0,
        totalOtherCost: 0,
        totalSpend: 0,
        totalCostPerKm: 0,
        // Legacy
        costPerKm: 0,
        totalCost: 0
      };

      if (entries.length > 0) {
        stats.totalFuel = entries.reduce((sum, e) => sum + e.fuelAmount, 0);
        stats.totalFuelCost = entries.reduce((sum, e) => sum + e.cost, 0);

        const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
        if (tripDistanceSum > 0) {
          stats.totalDistance = tripDistanceSum;
        } else {
          const lastOdometer = entries[entries.length - 1].odometer;
          const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
          stats.totalDistance = lastOdometer - firstOdometer;
        }

        stats.avgConsumption = stats.totalFuel > 0 ? stats.totalDistance / stats.totalFuel : 0;
        stats.fuelCostPerKm = stats.totalDistance > 0 ? stats.totalFuelCost / stats.totalDistance : 0;
      }

      // Calculate maintenance costs
      stats.totalMaintenanceCost = maintenanceEntries.reduce((sum, e) => sum + e.cost, 0);

      // Calculate road tax costs
      stats.totalRoadTaxCost = roadTaxEntries.reduce((sum, e) => sum + e.cost, 0);

      // Calculate insurance costs
      stats.totalInsuranceCost = insuranceEntries.reduce((sum, e) => sum + e.cost, 0);

      // Calculate depreciation to date (based on yearly depreciation and purchase date)
      if (vehicle.depreciationYearly && vehicle.purchaseDate) {
        const purchaseDate = new Date(vehicle.purchaseDate);
        const now = new Date();
        const yearsOwned = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);
        stats.totalDepreciationToDate = vehicle.depreciationYearly * yearsOwned;
      }

      // Total other costs (maintenance + road tax + insurance + depreciation)
      stats.totalOtherCost = stats.totalMaintenanceCost + stats.totalRoadTaxCost + stats.totalInsuranceCost + stats.totalDepreciationToDate;

      // Total spend (fuel + all other costs)
      stats.totalSpend = stats.totalFuelCost + stats.totalOtherCost;

      // Total cost per km
      stats.totalCostPerKm = stats.totalDistance > 0 ? stats.totalSpend / stats.totalDistance : 0;

      // Legacy fields for backwards compatibility
      stats.costPerKm = stats.totalCostPerKm;
      stats.totalCost = stats.totalFuelCost;

      return res.json({ ...vehicle, stats });
    }

    if (req.method === 'PUT') {
      const {
        name, make, model, year, initialOdometer,
        purchasePrice, purchaseDate, registrationCost, otherInitialCosts,
        insuranceCostYearly, roadTaxYearly, depreciationYearly,
        financingMonthlyPayment, financingInterestRate, financingStartDate, financingEndDate, financingTotalAmount
      } = req.body;

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
          initialOdometer: initialOdometer ? parseFloat(initialOdometer) : existing.initialOdometer,
          // Purchase & Initial Costs
          purchasePrice: purchasePrice !== undefined ? (purchasePrice ? parseFloat(purchasePrice) : null) : undefined,
          purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : undefined,
          registrationCost: registrationCost !== undefined ? (registrationCost ? parseFloat(registrationCost) : null) : undefined,
          otherInitialCosts: otherInitialCosts !== undefined ? (otherInitialCosts ? parseFloat(otherInitialCosts) : null) : undefined,
          // Recurring Annual Costs
          insuranceCostYearly: insuranceCostYearly !== undefined ? (insuranceCostYearly ? parseFloat(insuranceCostYearly) : null) : undefined,
          roadTaxYearly: roadTaxYearly !== undefined ? (roadTaxYearly ? parseFloat(roadTaxYearly) : null) : undefined,
          depreciationYearly: depreciationYearly !== undefined ? (depreciationYearly ? parseFloat(depreciationYearly) : null) : undefined,
          // Financing
          financingMonthlyPayment: financingMonthlyPayment !== undefined ? (financingMonthlyPayment ? parseFloat(financingMonthlyPayment) : null) : undefined,
          financingInterestRate: financingInterestRate !== undefined ? (financingInterestRate ? parseFloat(financingInterestRate) : null) : undefined,
          financingStartDate: financingStartDate !== undefined ? (financingStartDate ? new Date(financingStartDate) : null) : undefined,
          financingEndDate: financingEndDate !== undefined ? (financingEndDate ? new Date(financingEndDate) : null) : undefined,
          financingTotalAmount: financingTotalAmount !== undefined ? (financingTotalAmount ? parseFloat(financingTotalAmount) : null) : undefined
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
