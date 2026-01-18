// Database backup script - exports all data to JSON
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
  console.log('Starting database backup...\n');

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  try {
    // Export all data
    console.log('Fetching users...');
    const users = await prisma.user.findMany({
      include: {
        vehicles: {
          include: {
            fuelEntries: true,
            maintenanceEntries: true,
            roadTaxEntries: true,
            insuranceEntries: true
          }
        }
      }
    });

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        users: users.map(user => ({
          ...user,
          // Don't export password hash for security
          password: '[REDACTED]'
        }))
      },
      stats: {
        users: users.length,
        vehicles: users.reduce((sum, u) => sum + u.vehicles.length, 0),
        fuelEntries: users.reduce((sum, u) => sum + u.vehicles.reduce((s, v) => s + v.fuelEntries.length, 0), 0),
        maintenanceEntries: users.reduce((sum, u) => sum + u.vehicles.reduce((s, v) => s + v.maintenanceEntries.length, 0), 0),
        roadTaxEntries: users.reduce((sum, u) => sum + u.vehicles.reduce((s, v) => s + v.roadTaxEntries.length, 0), 0),
        insuranceEntries: users.reduce((sum, u) => sum + u.vehicles.reduce((s, v) => s + v.insuranceEntries.length, 0), 0)
      }
    };

    // Also export with password hashes for full restore (separate file)
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: { users }
    };

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\nBackup saved to: ${backupFile}`);

    const fullBackupFile = path.join(backupDir, `backup-full-${timestamp}.json`);
    fs.writeFileSync(fullBackupFile, JSON.stringify(fullBackup, null, 2));
    console.log(`Full backup saved to: ${fullBackupFile}`);

    console.log('\n--- Backup Statistics ---');
    console.log(`Users: ${backup.stats.users}`);
    console.log(`Vehicles: ${backup.stats.vehicles}`);
    console.log(`Fuel Entries: ${backup.stats.fuelEntries}`);
    console.log(`Maintenance Entries: ${backup.stats.maintenanceEntries}`);
    console.log(`Road Tax Entries: ${backup.stats.roadTaxEntries}`);
    console.log(`Insurance Entries: ${backup.stats.insuranceEntries}`);

    return { success: true, file: backupFile, fullFile: fullBackupFile, stats: backup.stats };
  } catch (error) {
    console.error('Backup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backup()
  .then(result => {
    console.log('\n✓ Backup completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Backup failed:', error.message);
    process.exit(1);
  });
