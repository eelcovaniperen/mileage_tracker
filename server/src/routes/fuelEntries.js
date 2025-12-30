const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get fuel entries for a vehicle
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    // Verify vehicle ownership
    const vehicle = await req.prisma.vehicle.findFirst({
      where: {
        id: req.params.vehicleId,
        userId: req.userId
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const entries = await req.prisma.fuelEntry.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    console.error('Get fuel entries error:', error);
    res.status(500).json({ error: 'Failed to get fuel entries' });
  }
});

// Create fuel entry
router.post('/', async (req, res) => {
  try {
    const { vehicleId, date, odometer, fuelAmount, cost, fullTank, notes, gasStation, tripDistance, pricePerLiter, tyres } = req.body;

    if (!vehicleId || !date || !odometer || !fuelAmount || cost === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify vehicle ownership
    const vehicle = await req.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: req.userId
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check odometer is valid (not less than previous entry)
    const lastEntry = await req.prisma.fuelEntry.findFirst({
      where: { vehicleId },
      orderBy: { odometer: 'desc' }
    });

    if (lastEntry && parseFloat(odometer) < lastEntry.odometer) {
      return res.status(400).json({
        error: `Odometer reading must be at least ${lastEntry.odometer} km`
      });
    }

    const entry = await req.prisma.fuelEntry.create({
      data: {
        vehicleId,
        date: new Date(date),
        odometer: parseFloat(odometer),
        fuelAmount: parseFloat(fuelAmount),
        cost: parseFloat(cost),
        fullTank: fullTank !== false,
        notes,
        gasStation: gasStation || null,
        tripDistance: tripDistance ? parseFloat(tripDistance) : null,
        pricePerLiter: pricePerLiter ? parseFloat(pricePerLiter) : null,
        tyres: tyres || null
      }
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Create fuel entry error:', error);
    res.status(500).json({ error: 'Failed to create fuel entry' });
  }
});

// Update fuel entry
router.put('/:id', async (req, res) => {
  try {
    const { date, odometer, fuelAmount, cost, fullTank, notes, gasStation, tripDistance, pricePerLiter, tyres } = req.body;

    // Get entry and verify ownership through vehicle
    const existing = await req.prisma.fuelEntry.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true }
    });

    if (!existing || existing.vehicle.userId !== req.userId) {
      return res.status(404).json({ error: 'Fuel entry not found' });
    }

    const entry = await req.prisma.fuelEntry.update({
      where: { id: req.params.id },
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

    res.json(entry);
  } catch (error) {
    console.error('Update fuel entry error:', error);
    res.status(500).json({ error: 'Failed to update fuel entry' });
  }
});

// Delete fuel entry
router.delete('/:id', async (req, res) => {
  try {
    // Get entry and verify ownership through vehicle
    const existing = await req.prisma.fuelEntry.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true }
    });

    if (!existing || existing.vehicle.userId !== req.userId) {
      return res.status(404).json({ error: 'Fuel entry not found' });
    }

    await req.prisma.fuelEntry.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Fuel entry deleted' });
  } catch (error) {
    console.error('Delete fuel entry error:', error);
    res.status(500).json({ error: 'Failed to delete fuel entry' });
  }
});

// Get dashboard stats for all user's vehicles
router.get('/dashboard/stats', async (req, res) => {
  try {
    const vehicles = await req.prisma.vehicle.findMany({
      where: { userId: req.userId },
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

      // Totals
      totalFuel += entries.reduce((sum, e) => sum + e.fuelAmount, 0);
      totalCost += entries.reduce((sum, e) => sum + e.cost, 0);

      // Total distance: prefer sum of tripDistances, fallback to odometer difference
      const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
      if (tripDistanceSum > 0) {
        totalDistance += tripDistanceSum;
      } else {
        const lastOdometer = entries[entries.length - 1].odometer;
        const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
        totalDistance += lastOdometer - firstOdometer;
      }

      // Monthly aggregation
      for (const entry of entries) {
        const monthKey = entry.date.toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { fuel: 0, cost: 0 };
        }
        monthlyData[monthKey].fuel += entry.fuelAmount;
        monthlyData[monthKey].cost += entry.cost;
      }

      // Consumption trend (per fill-up) in km/L
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].fullTank && entries[i - 1].fullTank) {
          const distance = entries[i].odometer - entries[i - 1].odometer;
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

    // Convert monthly data to array
    const monthly = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        fuel: Math.round(data.fuel * 100) / 100,
        cost: Math.round(data.cost * 100) / 100
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Average consumption (km/L) = total distance / total fuel
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
});

module.exports = router;
