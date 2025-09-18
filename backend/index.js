const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require("dotenv").config();

const db = require("./lib/database");
const { requireAuth, requireAdmin, generateJwt, authenticateUser } = require("./middleware/auth");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Authentication routes
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await authenticateUser(email, password);
    const token = generateJwt(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        tenantSlug: user.tenant_slug,
        tenantName: user.tenant_name,
        tenantPlan: user.tenant_plan
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Notes CRUD routes
app.get("/notes", requireAuth, async (req, res) => {
  try {
    const notes = await db.getNotesByTenant(req.user.tenantId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/notes/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const note = await db.getNoteById(id, req.user.tenantId);
    
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

app.post("/notes", requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    // Check subscription limits for free plan
    if (req.user.tenantPlan === 'free') {
      const notesCount = await db.getNotesCountByTenant(req.user.tenantId);
      if (notesCount >= 3) {
        return res.status(403).json({ 
          error: "Free plan limit reached. Upgrade to Pro to create more notes.",
          limitReached: true
        });
      }
    }

    const noteId = uuidv4();
    await db.createNote({
      id: noteId,
      title,
      content,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    const note = await db.getNoteById(noteId, req.user.tenantId);
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/notes/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const existingNote = await db.getNoteById(id, req.user.tenantId);
    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    await db.updateNote(id, title, content, req.user.tenantId);
    const updatedNote = await db.getNoteById(id, req.user.tenantId);
    
    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/notes/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingNote = await db.getNoteById(id, req.user.tenantId);
    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    await db.deleteNote(id, req.user.tenantId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// Tenant upgrade route (Admin only)
app.post("/tenants/:slug/upgrade", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Verify the admin belongs to the tenant they're trying to upgrade
    if (req.user.tenantSlug !== slug) {
      return res.status(403).json({ error: "Forbidden - Cannot upgrade other tenants" });
    }

    const tenant = await db.getTenantBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    if (tenant.plan === 'pro') {
      return res.status(400).json({ error: "Tenant is already on Pro plan" });
    }

    await db.upgradeTenantPlan(tenant.id);
    
    res.json({ 
      message: "Tenant upgraded to Pro plan successfully",
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: 'pro'
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to upgrade tenant" });
  }
});

// Invite user to tenant (Admin only)
// Body: { email: string, role?: 'member' | 'admin', password?: string }
app.post("/tenants/:slug/invite", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, role = 'member', password = 'password' } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Admin can only invite within their own tenant
    if (req.user.tenantSlug !== slug) {
      return res.status(403).json({ error: "Forbidden - Cannot invite users to other tenants" });
    }

    const tenant = await db.getTenantBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Prevent duplicate emails
    const taken = await db.isEmailTaken(email);
    if (taken) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    await db.createUser({ id, email, passwordHash, role, tenantId: tenant.id });

    res.status(201).json({
      user: {
        id,
        email,
        role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
      defaultPassword: password === 'password' ? 'password' : undefined,
      message: 'User invited successfully',
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to invite user" });
  }
});

// User profile route
app.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
      tenantSlug: req.user.tenantSlug,
      tenantName: req.user.tenantName,
      tenantPlan: req.user.tenantPlan
    }
  });
});

// Basic route
app.get("/", (req, res) => {
  res.json({ 
    message: "Multi-tenant SaaS Notes API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      login: "POST /auth/login",
      notes: "GET /notes",
      createNote: "POST /notes",
      getNote: "GET /notes/:id",
      updateNote: "PUT /notes/:id",
      deleteNote: "DELETE /notes/:id",
      upgrade: "POST /tenants/:slug/upgrade",
      profile: "GET /me"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.init();
    app.listen(port, () => {
      console.log(`Multi-tenant SaaS Notes API is running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
