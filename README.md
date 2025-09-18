# Multi-Tenant SaaS Notes Application

A complete multi-tenant SaaS Notes Application built with Node.js, React, and SQLite, featuring JWT authentication, role-based access control, and subscription-based feature gating.

## 🏗️ Multi-Tenancy Architecture

This application uses a **shared schema with tenant ID** approach for multi-tenancy:

- **Database**: Single SQLite database with tenant isolation via `tenant_id` foreign keys
- **Isolation**: All data queries include tenant filtering to ensure strict data isolation
- **Scalability**: Easy to migrate to PostgreSQL/MySQL for production with the same schema design
- **Benefits**: 
  - Simple to implement and maintain
  - Cost-effective for small to medium scale
  - Easy backup and migration
  - Shared resources reduce operational overhead

### Database Schema

```sql
-- Tenants table
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table with tenant relationship
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  tenant_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

-- Notes table with tenant isolation
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🚀 Features

### Multi-Tenancy
- ✅ Support for multiple tenants (Acme and Globex)
- ✅ Strict data isolation between tenants
- ✅ Tenant-specific user management

### Authentication & Authorization
- ✅ JWT-based authentication
- ✅ Role-based access control (Admin/Member)
- ✅ Predefined test accounts with password: `password`

### Subscription Management
- ✅ Free Plan: Limited to 3 notes per tenant
- ✅ Pro Plan: Unlimited notes
- ✅ Admin-only upgrade endpoint
- ✅ Real-time limit enforcement

### Notes Management
- ✅ Full CRUD operations for notes
- ✅ Tenant-isolated note storage
- ✅ Role-based permissions

### Deployment
- ✅ Vercel-ready configuration
- ✅ CORS enabled for API access
- ✅ Health endpoint for monitoring

## 🧪 Test Accounts

All test accounts use the password: `password`

| Email | Role | Tenant | Plan |
|-------|------|--------|------|
| admin@acme.test | Admin | Acme | Free |
| user@acme.test | Member | Acme | Free |
| admin@globex.test | Admin | Globex | Free |
| user@globex.test | Member | Globex | Free |

## 📡 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /me` - Get current user profile

### Notes CRUD
- `GET /notes` - List all notes for current tenant
- `GET /notes/:id` - Get specific note
- `POST /notes` - Create new note
- `PUT /notes/:id` - Update note
- `DELETE /notes/:id` - Delete note

### Tenant Management
- `POST /tenants/:slug/upgrade` - Upgrade tenant to Pro plan (Admin only)

### System
- `GET /health` - Health check endpoint
- `GET /` - API information

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variables (optional):
```bash
# Create .env file
echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" > .env
echo "PORT=3000" >> .env
```

4. Start the development server:
```bash
npm run dev
```

The backend API will be running at http://localhost:3000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variables (optional):
```bash
# Create .env file
echo "VITE_API_BASE_URL=http://localhost:3000" > .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be running at http://localhost:5173

## 🚀 Vercel Deployment

### Backend Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Navigate to backend directory:
```bash
cd backend
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel dashboard:
   - `JWT_SECRET`: Your secure JWT secret key
   - `NODE_ENV`: production

### Frontend Deployment

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `VITE_API_BASE_URL`: Your deployed backend URL

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **CORS Configuration**: Properly configured for production
- **Input Validation**: Server-side validation for all endpoints
- **SQL Injection Protection**: Parameterized queries
- **Tenant Isolation**: Strict data separation between tenants

## 📊 Database

The application uses SQLite for simplicity and ease of deployment. For production use, consider migrating to PostgreSQL or MySQL:

1. **SQLite**: Perfect for development and small-scale deployments
2. **PostgreSQL/MySQL**: Recommended for production with high concurrency

The schema is designed to be database-agnostic and can be easily migrated.

## 🧪 Testing

The application includes comprehensive test scenarios:

1. **Health Check**: Verify API availability
2. **Authentication**: Test all predefined accounts
3. **Tenant Isolation**: Ensure data separation
4. **Role-Based Access**: Verify Admin/Member permissions
5. **Subscription Limits**: Test Free plan restrictions
6. **Upgrade Flow**: Test Pro plan upgrade
7. **CRUD Operations**: Test all note operations

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues, please open an issue in the repository.

