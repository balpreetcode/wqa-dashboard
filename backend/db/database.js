const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'wqa.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      target_url TEXT NOT NULL,
      agent TEXT NOT NULL CHECK (agent IN ('claude', 'opencode')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed')),

      -- Input files
      requirements_file TEXT,
      test_cases_csv TEXT,

      -- Results
      test_case_count INTEGER DEFAULT 0,
      passed_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,

      -- Output
      report_url TEXT,
      report_path TEXT,
      execution_log TEXT,
      error_message TEXT,

      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,

      -- Job tracking
      bull_job_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
    CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs(created_at DESC);
  `);

  saveDatabase();
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Database operations
const dbOps = {
  createRun(uuid, targetUrl, agent, requirementsFile, testCasesCsv) {
    const stmt = db.prepare(`
      INSERT INTO test_runs (uuid, target_url, agent, requirements_file, test_cases_csv)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run([uuid, targetUrl, agent, requirementsFile, testCasesCsv]);
    stmt.free();
    saveDatabase();

    // Get the inserted row
    const result = db.exec(`SELECT * FROM test_runs WHERE uuid = ?`, [uuid]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToObject(result[0]);
    }
    return null;
  },

  getRun(id) {
    const result = db.exec(`SELECT * FROM test_runs WHERE id = ?`, [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToObject(result[0]);
    }
    return null;
  },

  getRunByUuid(uuid) {
    const result = db.exec(`SELECT * FROM test_runs WHERE uuid = ?`, [uuid]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToObject(result[0]);
    }
    return null;
  },

  getAllRuns(limit = 50, offset = 0) {
    const result = db.exec(`SELECT * FROM test_runs ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
    if (result.length > 0) {
      return result[0].values.map((_, i) => rowToObject(result[0], i));
    }
    return [];
  },

  getRunCount() {
    const result = db.exec(`SELECT COUNT(*) as count FROM test_runs`);
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0];
    }
    return 0;
  },

  updateRunStatus(id, status) {
    const startedAt = status === 'running' ? "datetime('now')" : 'started_at';
    db.run(`UPDATE test_runs SET status = ?, started_at = ${status === 'running' ? "datetime('now')" : 'started_at'} WHERE id = ?`, [status, id]);
    saveDatabase();
  },

  updateRunCompleted(id, status, reportUrl, reportPath, executionLog, testCaseCount, passedCount, failedCount) {
    db.run(`
      UPDATE test_runs
      SET status = ?,
          completed_at = datetime('now'),
          report_url = ?,
          report_path = ?,
          execution_log = ?,
          test_case_count = ?,
          passed_count = ?,
          failed_count = ?
      WHERE id = ?
    `, [status, reportUrl, reportPath, executionLog, testCaseCount, passedCount, failedCount, id]);
    saveDatabase();
  },

  updateRunFailed(id, errorMessage, executionLog) {
    db.run(`
      UPDATE test_runs
      SET status = 'failed',
          completed_at = datetime('now'),
          error_message = ?,
          execution_log = ?
      WHERE id = ?
    `, [errorMessage, executionLog, id]);
    saveDatabase();
  },

  updateRunLog(id, executionLog) {
    db.run(`UPDATE test_runs SET execution_log = ? WHERE id = ?`, [executionLog, id]);
    saveDatabase();
  },

  updateBullJobId(id, bullJobId) {
    db.run(`UPDATE test_runs SET bull_job_id = ? WHERE id = ?`, [bullJobId, id]);
    saveDatabase();
  },

  deleteRun(id) {
    db.run(`DELETE FROM test_runs WHERE id = ?`, [id]);
    saveDatabase();
  }
};

// Helper to convert row to object
function rowToObject(result, rowIndex = 0) {
  const columns = result.columns;
  const values = result.values[rowIndex];
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

module.exports = {
  initDatabase,
  getDb,
  saveDatabase,
  dbOps
};
