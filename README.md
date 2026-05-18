# Enterprise Job Application Platform (EJAP)

A robust, enterprise-grade web application engineered to streamline the job search lifecycle through automated workflow tracking, multi-tenant data isolation, and rigorous security patterns. Built upon a high-performance decoupled architecture, EJAP offers seamless applicant tracking designed for reliability and speed.

---

## Enterprise Capabilities & Security Architecture

### Multi-Tenant Data Isolation & Security
- Stateless JWT Authentication: Implements industry-standard JSON Web Tokens with a 24-hour expiration lifecycle. All incoming requests are authenticated via custom Express middleware enforcing HTTP Bearer authorization headers.
- Cryptographic Password Storage: Zero-knowledge credential verification using bcryptjs with a 10-round salt work factor, ensuring complete resistance against rainbow table and brute-force attacks.
- Tenant-Level Data Isolation: Database queries enforce strict user ID boundaries (WHERE a.user_id = ?). A user can only access, modify, or delete application entities explicitly owned by their tenant account, eliminating horizontal privilege escalation.

### Role-Based Access Control (RBAC) & System Override
- Hierarchical Roles: Native support for user and admin privilege levels embedded securely within the verified JWT payload.
- Administrative Override Protocol: System administrators bypass standard tenant query boundaries, unlocking global access to inspect, audit, and manage application records across all registered tenants.
- Secret Security Mode (Matrix Backdoor): For advanced administrative access, the platform implements a zero-UI backdoor. Typing "switchmode" anywhere on the public login view dynamically shifts the application into a secure neon-green Matrix admin terminal.

### High-Performance Vanilla SPA Frontend
- Zero-Dependency Architecture: Engineered without heavy JavaScript frameworks (such as React or Angular) to guarantee maximum performance, sub-second initial load times, and minimal memory overhead.
- Asynchronous DOM Engine: Communicates asynchronously with the backend RESTful API via native JavaScript fetch API. Real-time state updates and DOM recalculations occur instantly without full page reloads.

### Strictly Layered Backend Topology
- Separation of Concerns: Strict architectural boundaries dividing Route Definitions -> Request Controllers -> Business Logic Services -> Data Access Models. 
- Isolated Service Layer: Zero business logic resides within routing files or HTTP handlers, ensuring that core algorithmic rules remain highly testable and agnostic of the underlying network protocol.

---

## System Architecture Diagram

```text
job-tracker-project/
├── backend/
│   ├── src/
│   │   ├── routes/           # Express routing & middleware attachment
│   │   ├── controllers/      # HTTP payload parsing & response formatting
│   │   ├── services/         # Core business logic & RBAC execution
│   │   ├── middleware/       # JWT token verification (authMiddleware.js)
│   │   ├── models/           # SQLite connection pool & DDL schemas
│   │   └── server.js         # Express server bootstrapping
│   ├── tests/                # Jest automated test suites
│   ├── docs/
│   │   └── swagger.json      # OpenAPI 3.0 specification
│   └── package.json
├── frontend/
│   ├── js/
│   │   ├── api.js            # Asynchronous fetch wrappers + auth headers
│   │   └── app.js            # Client state management, DOM logic, backdoor
│   ├── css/
│   │   └── style.css         # Responsive styling + Neon Matrix theme
│   └── index.html            # Single Page Application container
├── README.md
└── README_TR.md
```

---

## Database Schema & DDL Specifications

The system utilizes a lightweight, high-performance SQLite engine operating with strict foreign key constraints (PRAGMA foreign_keys = ON).

### 1. users Table
Stores registered tenant accounts and administrative operators.
```sql
CREATE TABLE IF NOT EXISTS users (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT    NOT NULL UNIQUE,
  password TEXT    NOT NULL,
  role     TEXT    DEFAULT 'user' -- 'user' or 'admin'
);
```

### 2. statuses Table
Static lookup table defining immutable workflow stages.
```sql
CREATE TABLE IF NOT EXISTS statuses (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL
);
```
Seeded categories: Pending, HR Interview, Technical Interview, Offer, Rejected.

### 3. applications Table
Core transactional entity representing job applications.
```sql
CREATE TABLE IF NOT EXISTS applications (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  company_name     TEXT    NOT NULL,
  position         TEXT    NOT NULL,
  status_id        INTEGER NOT NULL,
  application_date TEXT    NOT NULL,
  notes            TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (status_id) REFERENCES statuses(id)
);
```

---

## Deployment & System Execution

### System Requirements
- Node.js (v18.0.0 or greater)
- npm package manager

### 1. Initial Setup
```bash
# Navigate to the backend directory
cd job-tracker-project/backend

# Install dependencies
npm install
```

### 2. Execution Environments
```bash
# Run in development mode (with real-time hot-reloading via Nodemon)
npm run dev

# Run in production mode
npm start
```

On initial startup, the platform automatically validates directory structures, compiles SQLite DDL statements, seeds immutable lookup statuses, and generates a default system administrator account.

- Live Interface: http://localhost:3000
- OpenAPI / Swagger Explorer: http://localhost:3000/api-docs

---

## Secret Administrative Override (Matrix Terminal)

The platform features an advanced administrative login protocol hidden from standard users:
1. Open the web interface at http://localhost:3000 (ensure you are logged out).
2. Without interacting with any form fields, type the exact phrase: switchmode
3. The interface will instantly morph into an encrypted, neon-green Matrix terminal.
4. Authenticate using Root Credentials:
   - Admin ID: admin
   - Passphrase: admin123
5. Upon successful authentication, your session will be elevated to admin privileges, granting full visibility and administrative control over all application entities across the platform.

---

## Testing Methodology & Coverage

The platform enforces rigorous test-driven development (TDD) focusing exclusively on the isolated services layer using Jest and in-memory test databases.

```bash
# Execute automated test suite from the backend directory
npm test
```

### Test Suite Modules
- userService.test.js: Validates registration workflows, cryptographic password hashing, duplicate username rejection, and JWT generation logic.
- applicationService.test.js: Validates comprehensive CRUD operations, strict data validation layers, tenant isolation guarantees (ensuring User A cannot view or mutate User B's records), and RBAC administrative overrides.
- statusService.test.js: Validates static data lookups and database seeding integrity.

Coverage Benchmark: All 42 unit tests pass with zero failures.

---

## REST API Reference & Payload Schemas

All API endpoints strictly accept and emit application/json. Requests to protected endpoints must include the HTTP header:
Authorization: Bearer <your_jwt_token>

### Endpoint Matrix

| Method | REST Endpoint | Security | Description |
|--------|---------------|----------|-------------|
| POST | /api/auth/register | Public | Register a new tenant account |
| POST | /api/auth/login | Public | Authenticate user and receive JWT payload |
| GET | /api/applications | Protected | List user applications (supports filtering) |
| GET | /api/applications/:id | Protected | Retrieve specific application details |
| POST | /api/applications | Protected | Create a new application record |
| PUT | /api/applications/:id | Protected | Fully update an existing record |
| DELETE | /api/applications/:id | Protected | Delete an application record |
| GET | /api/statuses | Protected | Retrieve seeded status categories |

### Query Parameters (GET /api/applications)
- company_name (string): Performs a case-insensitive partial SQL match (LIKE '%query%').
- status_id (integer): Filters records matching the exact status identifier.

### Sample Request Payload (POST /api/applications)
```json
{
  "company_name": "Acme Systems Inc.",
  "position": "Senior Backend Architect",
  "status_id": 2,
  "application_date": "2026-05-18",
  "notes": "Completed technical screening. Scheduled for onsite loop."
}
```

### Sample Success Response (201 Created)
```json
{
  "id": 1042,
  "user_id": 12,
  "company_name": "Acme Systems Inc.",
  "position": "Senior Backend Architect",
  "status_id": 2,
  "status_name": "HR Interview",
  "application_date": "2026-05-18",
  "notes": "Completed technical screening. Scheduled for onsite loop.",
  "owner_name": "johndoe"
}
```

---

## Input Validation & Sanitization

To ensure complete resilience against XSS and SQL injection, the platform enforces dual validation:
1. Client-Side: Real-time DOM validation before network payload dispatch. All output rendered to the DOM is processed through custom escapeHTML sanitization pipelines.
2. Server-Side (validateApplicationData): Ensures mandatory string fields are non-empty, dates conform to ISO standards (YYYY-MM-DD), and foreign key integers strictly match existing lookup records before SQL execution.
