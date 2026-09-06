import { DatabaseSync } from 'node:sqlite';
export function createD1(path) {
  const database = new DatabaseSync(path);
  database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const prepare = (sql, args = []) => ({
    bind(...values) { return prepare(sql, values); },
    first(column) { const row = database.prepare(sql).get(...args) ?? null; return Promise.resolve(column ? row?.[column] ?? null : row); },
    all() { return Promise.resolve(this.execute()); },
    run() { return Promise.resolve(this.execute()); },
    execute() {
      const statement = database.prepare(sql);
      if (statement.columns().length) return { success: true, results: statement.all(...args), meta: { changes: 0 } };
      const result = statement.run(...args);
      return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    },
  });
  return { database, prepare, exec(sql) { database.exec(sql); return Promise.resolve({count: 1, duration: 0}); },
    async batch(statements) {
      database.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(statement => statement.execute()); database.exec('COMMIT'); return results; }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
}
