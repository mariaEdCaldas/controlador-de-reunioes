import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// O banco fica em server/data/agenda.db (arquivo local, sem servidor externo).
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const dbFile = path.join(dataDir, 'agenda.db');

export const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tabela de controle de versao do schema. As tabelas de negocio
// (palestrantes, reunioes, checklist...) entram nos proximos modulos.
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_info (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
`);

db.prepare(
  `INSERT INTO schema_info (chave, valor) VALUES ('versao', '0')
   ON CONFLICT(chave) DO NOTHING`
).run();
