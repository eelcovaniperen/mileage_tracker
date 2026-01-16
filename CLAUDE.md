# CLAUDE.md - AI Assistant Guide for DriveTotal

> **Last Updated:** 2026-01-16
> **Project:** DriveTotal (formerly Mileage Tracker)
> **Architecture:** Full-stack React SPA with Express/Serverless backend
> **Database:** PostgreSQL (production) / SQLite (development)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Directory Structure](#directory-structure)
4. [Database Schema](#database-schema)
5. [API Endpoints & Routing](#api-endpoints--routing)
6. [Authentication & Security](#authentication--security)
7. [Development Workflows](#development-workflows)
8. [Key Patterns & Conventions](#key-patterns--conventions)
9. [Common Tasks](#common-tasks)
10. [Important Constraints](#important-constraints)
11. [Testing Strategy](#testing-strategy)
12. [Deployment](#deployment)

---

## Project Overview

**DriveTotal** is a comprehensive vehicle expense tracking application that allows users to:
- Track fuel consumption and calculate fuel efficiency metrics
- Monitor maintenance expenses with categorization
- Record road tax and insurance periods
- Calculate total cost of ownership (TCO) with depreciation
- Visualize analytics with T12M (trailing 12-month) metrics
- Manage multiple vehicles with detailed cost breakdowns

### Project Maturity
- **Status:** Beta / Production-Ready
- **Deployment:** Vercel (serverless functions + static hosting)
- **Database:** Supabase PostgreSQL
- **Active Development:** Yes (recent commits show ongoing feature additions)

---

## Architecture & Technology Stack

### Architecture Pattern

This is a **monorepo** with a hybrid development/production architecture:

```
DEVELOPMENT:                    PRODUCTION (Vercel):
┌──────────────┐               ┌──────────────┐
│ React Client │               │ React Client │
│  (Vite dev)  │               │   (Static)   │
└──────┬───────┘               └──────┬───────┘
       │                              │
       ↓                              ↓
┌──────────────┐               ┌──────────────┐
│   Express    │               │  Serverless  │
│    Server    │               │   Function   │
│ (port 3001)  │               │ (api/handler)│
└──────┬───────┘               └──────┬───────┘
       │                              │
       ↓                              ↓
┌──────────────┐               ┌──────────────┐
│   SQLite DB  │               │  PostgreSQL  │
│   (local)    │               │  (Supabase)  │
└──────────────┘               └──────────────┘
```

### Technology Stack

**Frontend:**
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.0 | UI framework |
| React Router | 7.11.0 | Client-side routing |
| Vite | 7.2.4 | Build tool & dev server |
| Tailwind CSS | 4.1.18 | Styling framework |
| Recharts | 3.6.0 | Data visualization |
| Axios | 1.13.2 | HTTP client with interceptors |

**Backend:**
| Package | Version | Purpose |
|---------|---------|---------|
| Express.js | 5.2.1 | Web framework (dev only) |
| Prisma | 5.22.0 | ORM & migrations |
| bcryptjs | 3.0.3 | Password hashing (cost factor: 12) |
| jsonwebtoken | 9.0.3 | JWT authentication (7-day expiry) |
| cors | 2.8.5 | Cross-origin resource sharing |

**Database:**
| Environment | Provider | Connection |
|-------------|----------|------------|
| Development | SQLite | `file:./dev.db` |
| Production | PostgreSQL | Supabase via `DATABASE_URL` |

---

## Directory Structure

```
mileage_tracker/
├── api/
│   └── handler.js              # Single serverless function (594 lines)
├── client/
│   ├── public/
│   │   └── logo.png           # DriveTotal logo
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js       # HTTP client + API endpoints
│   │   ├── assets/           # Static images
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Navigation wrapper
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Vehicles.jsx
│   │   │   └── VehicleDetail.jsx
│   │   ├── App.jsx
│   │   ├── index.css         # Global styles + CSS variables
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── lib/                       # SHARED utilities (client + server)
│   ├── auth.js               # JWT generation/verification
│   ├── prisma.js             # Prisma client singleton
│   ├── rateLimit.js          # In-memory rate limiter
│   └── validation.js         # Input validation functions
├── prisma/
│   ├── migrations/           # 2 migrations (init + fuel fields)
│   └── schema.prisma         # Database schema (5 models)
├── scripts/
│   └── import-to-supabase.js # Data migration utility
├── server/                   # DEV-ONLY Express server
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT verification middleware
│   │   ├── routes/           # Express route handlers
│   │   └── index.js          # Express server entry
│   └── package.json
├── package.json              # Root package (Prisma scripts)
└── vercel.json               # Deployment config
```

### Critical Files for AI Assistants

**MUST READ before making changes:**
- `prisma/schema.prisma` - All database models and relations
- `api/handler.js` - Production API routing logic (all endpoints)
- `lib/validation.js` - Input validation rules
- `lib/auth.js` - Authentication logic
- `client/src/api/axios.js` - API endpoint definitions

**Configuration Files:**
- `vercel.json` - Deployment, rewrites, security headers
- `client/vite.config.js` - Frontend build & proxy settings
- `.gitignore` - Ignored files (env vars, DB files, node_modules)

---

## Database Schema

**Provider:** PostgreSQL (production), SQLite (development)
**ORM:** Prisma 5.22.0
**Location:** `/prisma/schema.prisma`

### Models

#### User
```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String    // bcrypt hashed with cost factor 12
  name      String?
  vehicles  Vehicle[]
  createdAt DateTime  @default(now())
}
```

**Validation Rules:**
- Email: RFC 5322 compliant, lowercase, trimmed
- Password: 8-128 chars, must contain ≥1 letter AND ≥1 number, no common passwords

---

#### Vehicle
```prisma
model Vehicle {
  id              String    @id @default(cuid())
  name            String
  make            String?
  model           String?
  year            Int?
  photo           String?
  initialOdometer Float     @default(0)

  // Purchase & Initial Costs
  purchasePrice       Float?
  purchaseDate        DateTime?
  registrationCost    Float?
  otherInitialCosts   Float?

  // Recurring Annual Costs
  insuranceCostYearly Float?
  roadTaxYearly       Float?
  depreciationYearly  Float?

  // Financing
  financingMonthlyPayment Float?
  financingInterestRate   Float?
  financingStartDate      DateTime?
  financingEndDate        DateTime?
  financingTotalAmount    Float?

  // Sale/Disposal
  soldDate        DateTime?
  soldPrice       Float?

  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  fuelEntries     FuelEntry[]
  maintenanceEntries MaintenanceEntry[]
  roadTaxEntries  RoadTaxEntry[]
  insuranceEntries InsuranceEntry[]
  createdAt       DateTime  @default(now())
}
```

**Key Features:**
- Comprehensive TCO tracking (purchase, recurring, financing, disposal)
- Cascading deletes: User → Vehicles → All entries
- Photo storage (URL string)

---

#### FuelEntry
```prisma
model FuelEntry {
  id            String   @id @default(cuid())
  date          DateTime
  odometer      Float
  fuelAmount    Float
  cost          Float
  fullTank      Boolean  @default(true)
  notes         String?
  gasStation    String?
  tripDistance  Float?   // Explicit distance (overrides odometer calc)
  pricePerLiter Float?
  tyres         String?  // Tire info if changed during refuel
  vehicleId     String
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
}
```

**Distance Calculation Logic:**
1. Use `tripDistance` if provided
2. Fallback: `odometer[n] - odometer[n-1]`

**Validation:**
- Odometer must not decrease (checked in API)
- All numeric fields must be positive

---

#### MaintenanceEntry
```prisma
model MaintenanceEntry {
  id              String   @id @default(cuid())
  date            DateTime
  odometer        Float?
  description     String
  cost            Float
  category        String   // service, repair, tires, brakes, oil, inspection, bodywork, other
  invoiceNumber   String?
  serviceProvider String?
  notes           String?
  vehicleId       String
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
}
```

**Categories:** service, repair, tires, brakes, oil, inspection, bodywork, other

---

#### RoadTaxEntry
```prisma
model RoadTaxEntry {
  id          String   @id @default(cuid())
  startDate   DateTime
  endDate     DateTime
  cost        Float
  notes       String?
  vehicleId   String
  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```

**Features:**
- Period-based tracking (startDate → endDate)
- Supports duplication for recurring annual entries

---

#### InsuranceEntry
```prisma
model InsuranceEntry {
  id          String   @id @default(cuid())
  startDate   DateTime
  endDate     DateTime
  cost        Float
  provider    String?
  policyNumber String?
  coverage    String?  // liability, comprehensive, etc.
  notes       String?
  vehicleId   String
  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```

---

## API Endpoints & Routing

### Production Architecture

**Single Serverless Function:** `/api/handler.js` (594 lines)

**Routing Logic:**
1. Parse request path: `/api/:resource/:idOrAction`
2. Extract `resource` and `idOrAction`
3. Route to appropriate handler based on HTTP method + resource

**Example:**
```
POST /api/vehicles          → createVehicle()
GET  /api/vehicles/abc123   → getVehicle(abc123)
PUT  /api/vehicles/abc123   → updateVehicle(abc123)
DELETE /api/vehicles/abc123 → deleteVehicle(abc123)
```

### Endpoint Reference

#### Authentication (Public)
| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/auth/login` | User login | `{ email, password }` |
| POST | `/api/auth/register` | User registration | `{ email, password, name? }` |

#### Authentication (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update user profile |

#### Vehicles
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/vehicles` | List all user vehicles | Yes |
| GET | `/api/vehicles/:id` | Get vehicle with stats | Yes |
| POST | `/api/vehicles` | Create vehicle | Yes |
| PUT | `/api/vehicles/:id` | Update vehicle | Yes |
| DELETE | `/api/vehicles/:id` | Delete vehicle | Yes |

#### Fuel Entries
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/fuel-entries` | Create entry | Yes |
| PUT | `/api/fuel-entries/:id` | Update entry | Yes |
| DELETE | `/api/fuel-entries/:id` | Delete entry | Yes |

#### Maintenance Entries
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/maintenance-entries` | Create entry | Yes |
| PUT | `/api/maintenance-entries/:id` | Update entry | Yes |
| DELETE | `/api/maintenance-entries/:id` | Delete entry | Yes |

#### Road Tax Entries
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/road-tax-entries` | Create entry | Yes |
| PUT | `/api/road-tax-entries/:id` | Update entry | Yes |
| DELETE | `/api/road-tax-entries/:id` | Delete entry | Yes |

#### Insurance Entries
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/insurance-entries` | Create entry | Yes |
| PUT | `/api/insurance-entries/:id` | Update entry | Yes |
| DELETE | `/api/insurance-entries/:id` | Delete entry | Yes |

#### Dashboard
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/dashboard/stats` | Aggregated statistics | Yes |

### Response Format

**Success:**
```json
{
  "id": "abc123",
  "name": "Toyota Camry",
  ...
}
```

**Error:**
```json
{
  "error": "Descriptive error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Server error

---

## Authentication & Security

### JWT Authentication

**Token Generation:**
```javascript
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

**Token Storage:** localStorage (client-side)

**Token Usage:**
```
Authorization: Bearer <token>
```

**Token Verification:**
- All protected routes verify JWT using `lib/auth.js`
- Invalid/expired tokens → 401 Unauthorized
- Client auto-redirects to `/login` on 401

---

### Password Security

**Hashing:**
- Algorithm: bcryptjs
- Cost factor: **12** (higher than standard 10)
- Timing attack prevention: Constant-time comparison with dummy hash

**Validation Rules:**
```javascript
// From lib/validation.js
{
  minLength: 8,
  maxLength: 128,
  requiresLetter: true,
  requiresNumber: true,
  blacklist: [
    'password123', 'qwerty123', '12345678',
    'abc12345', 'password1', 'letmein1',
    'welcome1', 'admin123', 'test1234'
  ]
}
```

---

### Rate Limiting

**Implementation:** In-memory (not persistent across restarts)

**Limits:**
- **Auth endpoints:** 5 attempts per minute (IP-based)
- **General API:** 100 requests per minute (user ID-based)

**Response Headers:**
```
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640000000
```

**429 Response:**
```json
{
  "error": "Too many requests, please try again in 60 seconds"
}
```

---

### CORS Configuration

**Allowed Origins:**
```javascript
const allowedOrigins = [
  'https://mileagetracker-lac.vercel.app',
  'https://drivetotal.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);
```

**Configuration:**
- Credentials: `true`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Authorization, Content-Type

---

### Input Validation

**Location:** `/lib/validation.js`

**Functions:**
- `validateEmail(email)` - RFC 5322 compliant + normalization
- `validatePassword(password)` - Strength + blacklist check
- `sanitizeString(str, maxLength)` - Trim + length limit

**Always validate:**
1. All user inputs before database operations
2. Email format and uniqueness
3. Numeric fields are positive
4. Odometer progression (no decrease)
5. Date ranges (startDate < endDate)

---

### Data Access Control

**User Isolation:**
```javascript
// ✅ CORRECT - Always filter by userId
const vehicles = await prisma.vehicle.findMany({
  where: { userId: req.user.userId }
});

// ❌ WRONG - Cross-user data exposure
const vehicles = await prisma.vehicle.findMany();
```

**Ownership Verification:**
```javascript
// Before updating/deleting, verify ownership
const vehicle = await prisma.vehicle.findUnique({
  where: { id: vehicleId }
});

if (!vehicle || vehicle.userId !== req.user.userId) {
  return res.status(404).json({ error: 'Vehicle not found' });
}
```

---

### Security Headers (Vercel)

**From `vercel.json`:**
```javascript
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store" // API routes only
}
```

---

### Environment Variables

**Required:**
```bash
JWT_SECRET=<random-256-bit-string>
DATABASE_URL=<postgresql-connection-string>
DIRECT_URL=<postgresql-direct-connection>  # Supabase pooler bypass
NODE_ENV=production
```

**Optional:**
```bash
VERCEL_URL=<auto-set-by-vercel>
PORT=3001  # Development only
```

**CRITICAL:** Never commit `.env` files. Use Vercel environment variables for production.

---

## Development Workflows

### Initial Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd mileage_tracker
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your JWT_SECRET and DATABASE_URL

# 3. Set up database
npx prisma generate
npx prisma migrate dev

# 4. Start development servers
npm run dev  # Client (port 5173)
cd server && npm run dev  # Server (port 3001)
```

### Database Migrations

**Create migration:**
```bash
npx prisma migrate dev --name descriptive_name
```

**Reset database (DESTRUCTIVE):**
```bash
npx prisma migrate reset
```

**View database:**
```bash
npx prisma studio  # Opens GUI at localhost:5555
```

**Production migration:**
```bash
npx prisma migrate deploy
```

---

### Git Workflow

**Branch Naming:**
- Feature branches: `claude/feature-description-<session-id>`
- Always develop on the assigned branch
- Never push to `main` or `master` directly

**Commit Guidelines:**
```bash
# Good commit messages
"Add fuel entry duplication feature"
"Fix odometer validation in FuelEntry API"
"Update vehicle statistics calculation logic"

# Bad commit messages
"Fix bug"
"Update files"
"WIP"
```

**Before Committing:**
1. Run linter: `cd client && npm run lint`
2. Test locally
3. Review changes: `git diff`
4. Stage relevant files only

**Push with retry:**
```bash
git push -u origin claude/feature-description-<session-id>

# If network error, retry with exponential backoff:
# Wait 2s → retry → wait 4s → retry → wait 8s → retry → wait 16s
```

---

### Adding New API Endpoints

**Step 1:** Define in `/api/handler.js`

```javascript
// Add to routing logic
if (resource === 'your-resource') {
  if (method === 'GET' && !idOrAction) {
    return handleGetYourResources(req, res);
  }
  if (method === 'POST') {
    return handleCreateYourResource(req, res);
  }
  // ... etc
}
```

**Step 2:** Implement handler function

```javascript
async function handleCreateYourResource(req, res) {
  try {
    // 1. Get user from JWT
    const decoded = verifyToken(req.headers.authorization?.split(' ')[1]);

    // 2. Validate input
    const { field1, field2 } = req.body;
    if (!field1) {
      return res.status(400).json({ error: 'field1 is required' });
    }

    // 3. Create in database
    const resource = await prisma.yourResource.create({
      data: {
        field1,
        field2,
        userId: decoded.userId
      }
    });

    // 4. Return success
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
}
```

**Step 3:** Add client API function in `/client/src/api/axios.js`

```javascript
export const createYourResource = (data) => api.post('/api/your-resource', data);
export const getYourResources = () => api.get('/api/your-resource');
```

**Step 4:** Update Vercel rewrites in `vercel.json` if needed

```json
{
  "source": "/api/your-resource/:id*",
  "destination": "/api/handler"
}
```

---

### Adding Database Models

**Step 1:** Update `/prisma/schema.prisma`

```prisma
model YourModel {
  id        String   @id @default(cuid())
  field1    String
  field2    Float?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

**Step 2:** Add relation to User model

```prisma
model User {
  // ... existing fields
  yourModels YourModel[]
}
```

**Step 3:** Create and apply migration

```bash
npx prisma migrate dev --name add_your_model
npx prisma generate
```

**Step 4:** Restart dev server to pick up Prisma changes

---

## Key Patterns & Conventions

### React Context Pattern

**AuthContext:**
```javascript
// Provider wraps app
<AuthProvider>
  <App />
</AuthProvider>

// Consumer hook
const { user, login, logout, loading } = useAuth();
```

**ThemeContext:**
```javascript
// Persists to localStorage
const { theme, toggleTheme } = useTheme();
// theme: 'light' | 'dark'
```

---

### Protected Routes

```javascript
<ProtectedRoute>
  <YourPage />
</ProtectedRoute>

// Redirects to /login if not authenticated
// Shows loading state during auth check
```

---

### API Client Pattern

**Axios Instance:**
```javascript
// Automatic token injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### CSS Variables & Theming

**Structure:**
```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #09090b;
  /* ... light theme */
}

.dark {
  --bg-primary: #09090b;
  --text-primary: #ffffff;
  /* ... dark theme */
}
```

**Usage:**
```jsx
<div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
```

**Fonts:**
- Headers: Syne (sans-serif)
- Data: IBM Plex Mono (monospace)
- Body: IBM Plex Sans (sans-serif)

---

### Statistics Calculation Pattern

**T12M (Trailing 12 Months):**
```javascript
const t12mStart = new Date();
t12mStart.setFullYear(t12mStart.getFullYear() - 1);

const entries = await prisma.fuelEntry.findMany({
  where: {
    vehicleId,
    date: { gte: t12mStart }
  },
  orderBy: { date: 'asc' }
});
```

**Distance Calculation:**
```javascript
// Prefer explicit tripDistance, fallback to odometer diff
const distance = entry.tripDistance ||
  (entry.odometer - previousEntry.odometer);
```

---

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| API Routes | kebab-case | `/api/fuel-entries` |
| Functions | camelCase | `handleVehicleCreate` |
| React Components | PascalCase | `VehicleDetail` |
| CSS Classes | Tailwind + variables | `bg-[var(--bg-primary)]` |
| Database Models | PascalCase | `FuelEntry` |
| Environment Variables | SCREAMING_SNAKE_CASE | `JWT_SECRET` |

---

### Error Handling Pattern

**API Handlers:**
```javascript
try {
  // ... logic
} catch (error) {
  console.error('Error description:', error);
  res.status(500).json({ error: 'User-friendly message' });
}
```

**Client:**
```javascript
try {
  await api.createVehicle(data);
} catch (error) {
  alert(error.response?.data?.error || 'An error occurred');
}
```

---

## Common Tasks

### Adding a New Page

1. Create component in `/client/src/pages/YourPage.jsx`
2. Add route in `/client/src/App.jsx`:
   ```javascript
   <Route path="/your-page" element={<ProtectedRoute><YourPage /></ProtectedRoute>} />
   ```
3. Add navigation link in `/client/src/components/Layout.jsx`

---

### Adding a Form Field to Existing Model

1. Update schema in `/prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_field_name`
3. Update API handler to accept new field
4. Update frontend form to include new input
5. Update validation if needed

---

### Debugging Production Issues

**Check Vercel logs:**
```bash
vercel logs <deployment-url>
```

**Check Supabase logs:**
- Visit Supabase dashboard → Database → Logs

**Common issues:**
- Missing environment variables (JWT_SECRET, DATABASE_URL)
- CORS errors (check allowed origins)
- Rate limiting (check X-RateLimit headers)
- Database connection errors (check DIRECT_URL)

---

### Running Database Queries

**Prisma Studio:**
```bash
npx prisma studio
```

**Direct SQL (use with caution):**
```bash
npx prisma db execute --file query.sql
```

---

## Important Constraints

### Critical Limitations

1. **No Automated Testing**
   - ❌ No test suite exists
   - ⚠️ Manual testing required for all changes
   - **Action:** Consider adding Vitest (frontend) + Jest (backend)

2. **Serverless Function Size**
   - Current: 594 lines in single handler
   - Vercel limit: 50MB (plenty of headroom)
   - **Concern:** Complexity, not size
   - **Action:** Consider splitting if exceeds 1000 lines

3. **Rate Limiting Not Persistent**
   - In-memory only (resets on serverless cold start)
   - **Action:** Consider Redis for production-grade rate limiting

4. **No Email Verification**
   - Users can register with any email
   - No password reset flow
   - **Action:** Implement email verification for production

5. **No Real-Time Features**
   - No WebSocket support
   - No push notifications
   - **Limitation:** Vercel serverless functions are stateless

---

### Data Validation Rules to Enforce

**Always validate:**
- Odometer values must not decrease
- Dates must be valid and not in far future
- Costs/amounts must be positive
- Required fields must be present
- String lengths must be reasonable (≤ 255 chars for most fields)

**Example:**
```javascript
// BAD - No validation
const vehicle = await prisma.vehicle.create({ data: req.body });

// GOOD - Validate first
const { name, initialOdometer } = req.body;
if (!name || name.length > 255) {
  return res.status(400).json({ error: 'Invalid name' });
}
if (initialOdometer < 0) {
  return res.status(400).json({ error: 'Odometer cannot be negative' });
}
```

---

### Database Constraints

**Cascading Deletes:**
```
User deleted → All vehicles deleted
Vehicle deleted → All entries (fuel, maintenance, tax, insurance) deleted
```

**Never:**
- Delete users without warning
- Bypass Prisma ORM (no raw SQL modifications)
- Expose sensitive data in API responses (password hashes, JWT secrets)

---

### Performance Considerations

**Pagination:**
- Not implemented yet
- **Action:** Add pagination for vehicles/entries with >100 records

**Database Indexes:**
- Prisma auto-indexes: `@id`, `@unique`, foreign keys
- **Action:** Consider indexing `date` fields for faster queries

**Frontend Bundle Size:**
- Recharts is heavy (~500KB)
- **Action:** Consider lazy loading charts

---

## Testing Strategy

### Current Status
⚠️ **NO TESTS EXIST**

### Recommended Testing Strategy

**Unit Tests (Backend):**
```bash
# Install Jest
npm install --save-dev jest @types/jest

# Test files: server/src/**/*.test.js
# Example: lib/validation.test.js
```

**Component Tests (Frontend):**
```bash
# Install Vitest + React Testing Library
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Test files: client/src/**/*.test.jsx
```

**Integration Tests:**
- Test API endpoints with supertest
- Test database operations with test database
- Test authentication flows end-to-end

**E2E Tests:**
- Consider Playwright or Cypress
- Test critical user journeys:
  - Registration → Login → Create Vehicle → Add Fuel Entry

---

## Deployment

### Vercel Configuration

**Build Command:**
```bash
cd client && npm install && npm run build
```

**Output Directory:**
```
client/dist
```

**Install Command:**
```bash
npm install && cd client && npm install
```

**Environment Variables (Set in Vercel Dashboard):**
- `JWT_SECRET` - Random 256-bit string
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `DIRECT_URL` - Supabase direct connection (pooler bypass)
- `NODE_ENV` - Set to `production`

---

### Deployment Checklist

**Before deploying:**
1. ✅ Run linter: `cd client && npm run lint`
2. ✅ Test locally with production database
3. ✅ Check environment variables are set in Vercel
4. ✅ Review git diff for unintended changes
5. ✅ Ensure database migrations are applied: `npx prisma migrate deploy`
6. ✅ Test on Vercel preview deployment first

**After deploying:**
1. ✅ Verify site loads (check CORS)
2. ✅ Test login/registration
3. ✅ Test CRUD operations
4. ✅ Check Vercel function logs for errors
5. ✅ Monitor Supabase database connections

---

### Database Migration Strategy

**Development:**
```bash
npx prisma migrate dev --name feature_name
```

**Production (automated by Vercel):**
- `postinstall` script runs `prisma generate`
- Migrations applied manually or via CI/CD

**NEVER:**
- Run `prisma migrate reset` in production
- Delete migration files after deployment
- Modify applied migration files

---

## AI Assistant Guidelines

### Before Making Changes

1. **Read relevant files first**
   - Never propose changes to code you haven't read
   - Use Read tool for existing files
   - Use Grep to find related code

2. **Understand ownership**
   - Check if feature exists in schema
   - Verify API endpoint is implemented
   - Check frontend has corresponding page/component

3. **Plan for dependencies**
   - Database change? → Migration + API + Frontend
   - API change? → Update client API functions
   - Frontend change? → Check API compatibility

---

### When Adding Features

1. **Start with schema**
   - Add models to `schema.prisma`
   - Create migration
   - Generate Prisma client

2. **Implement API**
   - Add to `/api/handler.js`
   - Implement validation
   - Add error handling
   - Verify user ownership

3. **Update frontend**
   - Add API functions to `axios.js`
   - Create/update page components
   - Add routing
   - Update navigation

4. **Test manually**
   - No automated tests exist
   - Test all CRUD operations
   - Verify auth protection
   - Check error states

---

### When Fixing Bugs

1. **Reproduce the issue**
   - Read the error message carefully
   - Check Vercel logs if production
   - Identify the source (frontend/backend/database)

2. **Locate the code**
   - Use Grep to find relevant functions
   - Read surrounding context
   - Check git history for recent changes

3. **Fix conservatively**
   - Minimal changes only
   - Don't refactor while fixing
   - Don't add "improvements" beyond the bug

4. **Verify the fix**
   - Test the specific scenario
   - Check for regressions
   - Review changes with git diff

---

### Security Best Practices for AI Assistants

**ALWAYS:**
- ✅ Validate all user inputs
- ✅ Filter database queries by `userId`
- ✅ Verify ownership before updates/deletes
- ✅ Use parameterized queries (Prisma handles this)
- ✅ Hash passwords with bcrypt (cost factor 12)
- ✅ Return generic error messages (don't leak data)

**NEVER:**
- ❌ Expose password hashes or JWT secrets
- ❌ Allow cross-user data access
- ❌ Trust user input without validation
- ❌ Log sensitive data (passwords, tokens)
- ❌ Commit `.env` files or secrets
- ❌ Disable security features (CORS, rate limiting)

---

### Code Style Guidelines

**JavaScript/JSX:**
- Use modern ES6+ syntax
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Destructure props and objects
- Use optional chaining: `user?.name`

**React:**
- Functional components only (no classes)
- Use hooks (useState, useEffect, useContext)
- Extract reusable logic to custom hooks
- Keep components focused (single responsibility)

**Tailwind:**
- Use utility classes
- Use CSS variables for theme colors
- Avoid custom CSS unless necessary
- Keep responsive design in mind (`md:`, `lg:`)

**Prisma:**
- Always use `include`/`select` for related data
- Filter by `userId` for user-owned resources
- Use transactions for multi-step operations
- Handle unique constraint violations

---

### Common Pitfalls to Avoid

1. **Forgetting to run Prisma generate**
   ```bash
   npx prisma generate  # After schema changes
   ```

2. **Not checking ownership**
   ```javascript
   // BAD
   const vehicle = await prisma.vehicle.findUnique({ where: { id } });

   // GOOD
   const vehicle = await prisma.vehicle.findFirst({
     where: { id, userId: req.user.userId }
   });
   ```

3. **Hardcoding URLs**
   ```javascript
   // BAD
   const API_URL = 'https://drivetotal.vercel.app/api';

   // GOOD
   const API_URL = import.meta.env.VITE_API_URL || '/api';
   ```

4. **Not handling errors**
   ```javascript
   // BAD
   const data = await api.getVehicles();

   // GOOD
   try {
     const data = await api.getVehicles();
   } catch (error) {
     console.error('Failed to load vehicles:', error);
     alert('Failed to load vehicles');
   }
   ```

5. **Exposing sensitive data**
   ```javascript
   // BAD
   res.json(user);  // Includes password hash

   // GOOD
   const { password, ...userWithoutPassword } = user;
   res.json(userWithoutPassword);
   ```

---

## Conclusion

This codebase is a well-structured, modern full-stack application with strong security practices. The main gaps are:
- Lack of automated testing
- No email verification/password reset
- No real-time features

When working on this codebase:
1. **Always read before writing**
2. **Follow the established patterns**
3. **Validate all inputs**
4. **Test manually and thoroughly**
5. **Keep changes minimal and focused**

**For questions or issues, refer to:**
- Git history: `git log --oneline --graph`
- Vercel logs: Check Vercel dashboard
- Database schema: `prisma/schema.prisma`
- API routes: `api/handler.js`

---

**Happy coding! 🚗**
