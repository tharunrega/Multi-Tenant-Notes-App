const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../lib/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const getTokenFromHeader = (headers) => {
  const { authorization } = headers;
  const bearerTokenIdentifier = "Bearer";

  if (!authorization) {
    throw new Error("Authorization header missing");
  }

  if (!authorization.startsWith(bearerTokenIdentifier)) {
    throw new Error("Authorization token type not supported");
  }

  return authorization.slice(bearerTokenIdentifier.length + 1);
};

const verifyJwt = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

const generateJwt = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug: user.tenant_slug,
      tenantPlan: user.tenant_plan
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req.headers);
    const payload = verifyJwt(token);
    
    // Get fresh user data from database
    const user = await db.getUserById(payload.id);
    if (!user) {
      throw new Error("User not found");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug: user.tenant_slug,
      tenantName: user.tenant_name,
      tenantPlan: user.tenant_plan
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }
    next();
  };
};

const requireAdmin = requireRole('admin');
const requireMember = requireRole('member');

const authenticateUser = async (email, password) => {
  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  return user;
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireMember,
  generateJwt,
  authenticateUser
};
