// ============================================================================
// LOCAL DEVELOPMENT ONLY — this Express server is NOT deployed to production.
// Production uses the Vercel serverless handler at api/handler.js (see
// vercel.json). The Vite dev server proxies /api → http://localhost:3001
// (this server) for local work.
//
// ANY route change here MUST be mirrored in api/handler.js or production
// will silently diverge from local behavior.
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const fuelEntryRoutes = require('./routes/fuelEntries');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/fuel-entries', fuelEntryRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
