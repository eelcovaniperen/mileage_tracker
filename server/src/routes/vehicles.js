const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all vehicles for user
router.get('/', async (req, res) => {
  try {
    const vehicles = await req.prisma.vehicle.findMany({
      where: { userId: req.userId },
      include: {
        fuelEntries: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to get vehicles' });
  }
});

// Get single vehicle with stats
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await req.prisma.vehicle.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
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
      // Total fuel and cost
      stats.totalFuel = entries.reduce((sum, e) => sum + e.fuelAmount, 0);
      stats.totalCost = entries.reduce((sum, e) => sum + e.cost, 0);

      // Total distance: prefer sum of tripDistances, fallback to odometer difference
      const tripDistanceSum = entries.reduce((sum, e) => sum + (e.tripDistance || 0), 0);
      if (tripDistanceSum > 0) {
        stats.totalDistance = tripDistanceSum;
      } else {
        // Fallback: last odometer - initial or first entry
        const lastOdometer = entries[entries.length - 1].odometer;
        const firstOdometer = vehicle.initialOdometer || entries[0].odometer;
        stats.totalDistance = lastOdometer - firstOdometer;
      }

      // Average consumption (km/L) = total distance / total fuel
      stats.avgConsumption = stats.totalFuel > 0 ? stats.totalDistance / stats.totalFuel : 0;
      stats.costPerKm = stats.totalDistance > 0 ? stats.totalCost / stats.totalDistance : 0;
    }

    res.json({ ...vehicle, stats });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to get vehicle' });
  }
});

// Create vehicle
router.post('/', async (req, res) => {
  try {
    const { name, make, model, year, initialOdometer } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vehicle name is required' });
    }

    const vehicle = await req.prisma.vehicle.create({
      data: {
        name,
        make,
        model,
        year: year ? parseInt(year) : null,
        initialOdometer: initialOdometer ? parseFloat(initialOdometer) : 0,
        userId: req.userId
      }
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const { name, make, model, year, initialOdometer } = req.body;

    // Check ownership
    const existing = await req.prisma.vehicle.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const vehicle = await req.prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        name,
        make,
        model,
        year: year ? parseInt(year) : null,
        initialOdometer: initialOdometer ? parseFloat(initialOdometer) : existing.initialOdometer
      }
    });

    res.json(vehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    // Check ownership
    const existing = await req.prisma.vehicle.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await req.prisma.vehicle.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

module.exports = router;
