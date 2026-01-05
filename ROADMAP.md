# DriveTotal Roadmap

> A comprehensive vehicle management and expense tracking application

**Repository**: [mileage_tracker](https://github.com/eelcovaniperen/mileage_tracker)
**Live URL**: https://mileagetracker-lac.vercel.app
**Last Updated**: January 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Completed Features](#completed-features)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Future Roadmap](#future-roadmap)
7. [Known Issues](#known-issues)
8. [Contributing](#contributing)

---

## Project Overview

DriveTotal is a full-stack web application for tracking vehicle expenses, fuel consumption, maintenance, and total cost of ownership. It provides comprehensive analytics to help users understand their vehicle costs over time.

### Key Capabilities

- Multi-vehicle management with photo uploads
- Fuel consumption tracking and efficiency calculations
- Maintenance, road tax, and insurance tracking
- Financial tracking: purchase price, depreciation, financing, sale
- Dashboard with analytics and trends
- Cost per kilometer calculations
- Trailing 12-month (T12M) rolling metrics

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| React Router | 6.x | Client-side routing |
| Vite | 7.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| Recharts | - | Charts & visualizations |
| Axios | - | HTTP client |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Runtime |
| Vercel Functions | - | Serverless API |
| Prisma | 5.22 | ORM |
| PostgreSQL | - | Database (Supabase) |
| JWT | - | Authentication |
| bcryptjs | - | Password hashing |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Hosting & Serverless Functions |
| Supabase | PostgreSQL Database |
| GitHub | Version Control |

---

## Completed Features

### Phase 1: Core Foundation
- [x] User authentication (register, login, logout)
- [x] JWT-based session management (7-day expiration)
- [x] Protected routes and authorization
- [x] Dark theme UI with custom design system
- [x] Responsive layout for mobile and desktop

### Phase 2: Vehicle Management
- [x] Create, read, update, delete vehicles
- [x] Vehicle details: name, make, model, year
- [x] Initial odometer tracking
- [x] Vehicle photo upload (base64, max 500KB)
- [x] Vehicle status: active/inactive (sold)
- [x] Cascade delete for related entries

### Phase 3: Fuel Tracking
- [x] Fuel entry CRUD operations
- [x] Required fields: date, odometer, fuel amount, cost
- [x] Optional fields: gas station, trip distance, price/liter, tire condition
- [x] Full tank indicator for accurate consumption
- [x] Odometer validation (prevent regression)
- [x] Consumption calculation (km/L)

### Phase 4: Maintenance Tracking
- [x] Maintenance entry CRUD operations
- [x] Categories: service, repair, tires, brakes, oil, inspection, bodywork, other
- [x] Track: date, odometer, description, cost
- [x] Optional: invoice number, service provider, notes

### Phase 5: Road Tax & Insurance
- [x] Road tax entry CRUD with period tracking
- [x] Insurance entry CRUD with coverage types
- [x] Coverage options: liability, comprehensive, collision, full
- [x] Provider and policy number tracking

### Phase 6: Financial Tracking
- [x] Purchase information (price, date, registration costs)
- [x] Annual cost projections (insurance, road tax, depreciation)
- [x] Financing details (monthly payment, interest rate, dates, total)
- [x] Sale/disposal tracking (date, price)
- [x] Actual vs expected depreciation calculation

### Phase 7: Cost Analytics
- [x] Total cost calculation (fuel + maintenance + depreciation + running costs)
- [x] Running costs (road tax + insurance + financing)
- [x] Net cost (total - sale proceeds)
- [x] Cost per kilometer (total cost / distance)
- [x] Fuel cost per kilometer

### Phase 8: Dashboard & Analytics
- [x] Summary statistics (all-time totals)
- [x] Trailing 12-month (T12M) metrics
- [x] Vehicle-level statistics
- [x] Monthly trend data
- [x] Consumption trend tracking
- [x] 24-month rolling T12M averages
- [x] Interactive charts (Recharts)

### Phase 9: Vehicles Overview Redesign
- [x] Row-based table layout
- [x] Vehicle photo thumbnails
- [x] KPIs: Distance, km/L, Fuel/km, Total Cost, Cost/km
- [x] Responsive mobile layout
- [x] SOLD badge for inactive vehicles
- [x] Hover-to-upload photo feature

### Phase 10: User Settings
- [x] Profile management (name, email)
- [x] Password change with verification
- [x] Form validation and feedback

---

## Database Schema

```
┌──────────────┐       ┌──────────────┐
│     User     │       │   Vehicle    │
├──────────────┤       ├──────────────┤
│ id           │───┐   │ id           │
│ email        │   │   │ name         │
│ password     │   │   │ make         │
│ name         │   │   │ model        │
│ createdAt    │   │   │ year         │
└──────────────┘   │   │ photo        │
                   │   │ initialOdo   │
                   │   │ purchasePrice│
                   │   │ purchaseDate │
                   │   │ depreciation │
                   │   │ financing... │
                   │   │ soldDate     │
                   │   │ soldPrice    │
                   └──►│ userId       │
                       │ createdAt    │
                       └──────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  FuelEntry   │    │ Maintenance  │    │  RoadTax     │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ id           │    │ id           │    │ id           │
│ date         │    │ date         │    │ startDate    │
│ odometer     │    │ odometer     │    │ endDate      │
│ fuelAmount   │    │ description  │    │ cost         │
│ cost         │    │ cost         │    │ notes        │
│ fullTank     │    │ category     │    │ vehicleId    │
│ gasStation   │    │ invoiceNum   │    │ createdAt    │
│ tripDistance │    │ provider     │    └──────────────┘
│ pricePerLiter│    │ notes        │
│ tyres        │    │ vehicleId    │    ┌──────────────┐
│ notes        │    │ createdAt    │    │  Insurance   │
│ vehicleId    │    └──────────────┘    ├──────────────┤
│ createdAt    │                        │ id           │
└──────────────┘                        │ startDate    │
                                        │ endDate      │
                                        │ cost         │
                                        │ provider     │
                                        │ policyNumber │
                                        │ coverage     │
                                        │ notes        │
                                        │ vehicleId    │
                                        │ createdAt    │
                                        └──────────────┘
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login and get token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Vehicles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List all vehicles |
| POST | `/api/vehicles` | Create vehicle |
| GET | `/api/vehicles/:id` | Get vehicle with stats |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Delete vehicle |

### Fuel Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fuel-entries` | Create fuel entry |
| PUT | `/api/fuel-entries/:id` | Update fuel entry |
| DELETE | `/api/fuel-entries/:id` | Delete fuel entry |

### Maintenance Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/maintenance-entries` | Create entry |
| PUT | `/api/maintenance-entries/:id` | Update entry |
| DELETE | `/api/maintenance-entries/:id` | Delete entry |

### Road Tax Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/road-tax-entries` | Create entry |
| PUT | `/api/road-tax-entries/:id` | Update entry |
| DELETE | `/api/road-tax-entries/:id` | Delete entry |

### Insurance Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/insurance-entries` | Create entry |
| PUT | `/api/insurance-entries/:id` | Update entry |
| DELETE | `/api/insurance-entries/:id` | Delete entry |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get all analytics |

---

## Future Roadmap

### Short-term (Next Release)

#### Data Export
- [ ] Export fuel entries to CSV
- [ ] Export maintenance history to CSV
- [ ] Export cost reports to PDF
- [ ] Full data export (JSON backup)

#### Reminders & Notifications
- [ ] Service reminder system (e.g., every 10,000 km)
- [ ] Insurance renewal reminders
- [ ] Road tax expiry alerts
- [ ] Email notification support

#### UI Improvements
- [ ] Bulk entry operations (delete multiple)
- [ ] Entry duplication feature
- [ ] Dark/Light theme toggle
- [ ] Custom date range filters

### Medium-term

#### Enhanced Analytics
- [x] Year-over-year comparison
- [x] Cost breakdown pie charts
- [x] Fuel price trend tracking
- [x] Projected annual costs
- [x] Compare vehicles side-by-side

#### Data Entry Improvements
- [ ] Receipt/document upload
- [ ] OCR for automatic data extraction
- [ ] Quick-add fuel entry (minimal fields)
- [ ] Recurring maintenance templates

#### Mobile Experience
- [ ] Progressive Web App (PWA)
- [ ] Offline mode with sync
- [ ] Native mobile app (React Native)
- [ ] Push notifications

### Long-term

#### Advanced Features
- [ ] Multi-currency support
- [ ] Fuel price API integration
- [ ] Trip tracking with GPS
- [ ] Driver assignment for fleet management
- [ ] CO2 emissions tracking

#### Integrations
- [ ] Google Maps integration (gas station lookup)
- [ ] OBD-II device integration
- [ ] Calendar sync for reminders
- [ ] Cloud storage for documents (Dropbox, Google Drive)

#### Collaboration
- [ ] Share vehicles with family members
- [ ] Fleet management features
- [ ] Role-based access control
- [ ] Activity audit log

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| CSS @import warning in build | Minor | Font import order in CSS |
| Bundle size > 500KB | Minor | Consider code splitting |
| Prisma v5 (v7 available) | Info | Major version upgrade available |

---

## Project Structure

```
mileage_tracker/
├── api/
│   ├── handler.js          # Main API handler (all routes)
│   └── dashboard/
│       └── stats.js        # Dashboard analytics endpoint
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js   # Axios HTTP client
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Vehicles.jsx
│   │   │   └── VehicleDetail.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── lib/
│   ├── auth.js             # JWT utilities
│   └── prisma.js           # Prisma client
├── prisma/
│   └── schema.prisma       # Database schema
├── package.json
├── vercel.json             # Vercel deployment config
└── ROADMAP.md              # This file
```

---

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase account)

### Environment Variables
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="your-secret-key"
```

### Local Development
```bash
# Install dependencies
npm install
cd client && npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

### Deployment
```bash
# Push to GitHub (auto-deploys via Vercel)
git push origin master

# Or manual Vercel deploy
npx vercel --prod
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Changelog

### v1.0.0 (January 2026)
- Initial release with full feature set
- Authentication and user management
- Vehicle, fuel, maintenance, tax, and insurance tracking
- Dashboard with analytics and charts
- Comprehensive cost calculations
- Responsive dark theme UI

---

*Built with React, Vercel, and Prisma*
