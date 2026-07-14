const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const configuredPath = process.env.DB_PATH || './data/grass_chessy.db';
const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.join(__dirname, '..', '..', configuredPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const rawDb = new DatabaseSync(dbPath);
rawDb.exec('PRAGMA foreign_keys = ON');
rawDb.exec('PRAGMA journal_mode = WAL');
rawDb.exec('PRAGMA busy_timeout = 5000');

const db = {
  exec(sql) {
    return rawDb.exec(sql);
  },
  pragma(sql) {
    return rawDb.exec(`PRAGMA ${sql}`);
  },
  prepare(sql) {
    const statement = rawDb.prepare(sql);
    return {
      get(...params) {
        return statement.get(...params);
      },
      all(...params) {
        return statement.all(...params);
      },
      run(...params) {
        const result = statement.run(...params);
        if (result && typeof result.lastInsertRowid === 'bigint') {
          result.lastInsertRowid = Number(result.lastInsertRowid);
        }
        if (result && typeof result.changes === 'bigint') {
          result.changes = Number(result.changes);
        }
        return result;
      }
    };
  },
  close() {
    rawDb.close();
  },
  path: dbPath
};

module.exports = db;
