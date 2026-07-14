import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { migrar } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// O banco fica em server/data/agenda.db (arquivo local, sem servidor externo).
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const dbFile = path.join(dataDir, 'agenda.db');

export const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migrations pendentes sao aplicadas no start, entao o banco nunca fica
// desatualizado em relacao ao codigo.
export const versaoSchema = migrar(db);
