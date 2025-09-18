# Deployment Guide

## Environment Variables

### Backend (.env)
```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Vercel Deployment

### 1. Backend Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to backend: `cd backend`
3. Run: `vercel`
4. Set environment variables in Vercel dashboard:
   - `JWT_SECRET`: Your secure JWT secret
   - `NODE_ENV`: production

### 2. Frontend Deployment

1. Navigate to frontend: `cd frontend`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard:
   - `VITE_API_BASE_URL`: Your deployed backend URL

## Testing the Deployment

1. Test health endpoint: `GET /health`
2. Test login with test accounts
3. Verify tenant isolation
4. Test subscription limits
5. Test upgrade functionality
