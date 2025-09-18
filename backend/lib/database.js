const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.NODE_ENV === 'production' 
        ? '/tmp/database.db' 
        : path.join(__dirname, '..', 'database.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      // Tenants table
      `CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
        tenant_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
      )`,
      
      // Notes table
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }

    // Create indexes for better performance
    await this.run('CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)');

    // Initialize with test data
    await this.initializeTestData();
  }

  async initializeTestData() {
    try {
      // Check if data already exists
      const tenantCount = await this.get('SELECT COUNT(*) as count FROM tenants');
      if (tenantCount.count > 0) {
        console.log('Test data already initialized');
        return;
      }

      const passwordHash = await bcrypt.hash('password', 10);

      // Create Acme tenant
      await this.run(
        'INSERT INTO tenants (id, slug, name, plan) VALUES (?, ?, ?, ?)',
        ['acme-tenant-id', 'acme', 'Acme Corp', 'free']
      );

      // Create Globex tenant
      await this.run(
        'INSERT INTO tenants (id, slug, name, plan) VALUES (?, ?, ?, ?)',
        ['globex-tenant-id', 'globex', 'Globex Corp', 'free']
      );

      // Create test users (admin + three members per tenant)
      const users = [
        // Acme
        ['admin-acme-id', 'admin@acme.test', passwordHash, 'admin', 'acme-tenant-id'],
        ['user-acme-id', 'user@acme.test', passwordHash, 'member', 'acme-tenant-id'],
        ['user2-acme-id', 'user2@acme.test', passwordHash, 'member', 'acme-tenant-id'],
        ['user3-acme-id', 'user3@acme.test', passwordHash, 'member', 'acme-tenant-id'],
        // Globex
        ['admin-globex-id', 'admin@globex.test', passwordHash, 'admin', 'globex-tenant-id'],
        ['user-globex-id', 'user@globex.test', passwordHash, 'member', 'globex-tenant-id'],
        ['user2-globex-id', 'user2@globex.test', passwordHash, 'member', 'globex-tenant-id'],
        ['user3-globex-id', 'user3@globex.test', passwordHash, 'member', 'globex-tenant-id']
      ];

      for (const user of users) {
        await this.run(
          'INSERT INTO users (id, email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?, ?)',
          user
        );
      }

      console.log('Test data initialized successfully');
    } catch (error) {
      console.error('Error initializing test data:', error);
    }
  }

  async createUser({ id, email, passwordHash, role = 'member', tenantId }) {
    return this.run(
      'INSERT INTO users (id, email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [id, email, passwordHash, role, tenantId]
    );
  }

  async isEmailTaken(email) {
    const row = await this.get('SELECT 1 as ok FROM users WHERE email = ?', [email]);
    return Boolean(row);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getUserByEmail(email) {
    return this.get(
      'SELECT u.*, t.slug as tenant_slug, t.name as tenant_name, t.plan as tenant_plan FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ?',
      [email]
    );
  }

  async getUserById(id) {
    return this.get(
      'SELECT u.*, t.slug as tenant_slug, t.name as tenant_name, t.plan as tenant_plan FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = ?',
      [id]
    );
  }

  async getNotesByTenant(tenantId) {
    return this.all(
      'SELECT n.*, u.email as created_by FROM notes n JOIN users u ON n.user_id = u.id WHERE n.tenant_id = ? ORDER BY n.updated_at DESC',
      [tenantId]
    );
  }

  async getNoteById(id, tenantId) {
    return this.get(
      'SELECT n.*, u.email as created_by FROM notes n JOIN users u ON n.user_id = u.id WHERE n.id = ? AND n.tenant_id = ?',
      [id, tenantId]
    );
  }

  async createNote(noteData) {
    const { id, title, content, tenantId, userId } = noteData;
    return this.run(
      'INSERT INTO notes (id, title, content, tenant_id, user_id) VALUES (?, ?, ?, ?, ?)',
      [id, title, content, tenantId, userId]
    );
  }

  async updateNote(id, title, content, tenantId) {
    return this.run(
      'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
      [title, content, id, tenantId]
    );
  }

  async deleteNote(id, tenantId) {
    return this.run(
      'DELETE FROM notes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
  }

  async getNotesCountByTenant(tenantId) {
    const result = await this.get('SELECT COUNT(*) as count FROM notes WHERE tenant_id = ?', [tenantId]);
    return result.count;
  }

  async upgradeTenantPlan(tenantId) {
    return this.run(
      'UPDATE tenants SET plan = ? WHERE id = ?',
      ['pro', tenantId]
    );
  }

  async getTenantBySlug(slug) {
    return this.get('SELECT * FROM tenants WHERE slug = ?', [slug]);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new Database();
