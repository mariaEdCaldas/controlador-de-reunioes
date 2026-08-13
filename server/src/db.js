import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { migrar } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Conexão:
//  - Produção (Turso): DATABASE_URL = libsql://... + DATABASE_TOKEN.
//  - Local: um arquivo SQLite em server/data/agenda.db (nada externo).
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
// URL file: pede barras normais (inclusive no Windows: file:C:/Users/.../agenda.db).
const arquivoLocal = `file:${path.join(dataDir, 'agenda.db').replace(/\\/g, '/')}`;

export const dbFile = process.env.DATABASE_URL || arquivoLocal;

const client = createClient({
  url: dbFile,
  authToken: process.env.DATABASE_TOKEN, // só usado no Turso
});

// SQLite desliga as foreign keys por padrão.
await client.execute('PRAGMA foreign_keys = ON');

/** Argumentos no formato do libsql: um objeto = parâmetros nomeados (@nome);
 *  qualquer outra coisa = posicional (?). Espelha o better-sqlite3. */
function paraArgs(lista) {
  if (
    lista.length === 1 &&
    lista[0] &&
    typeof lista[0] === 'object' &&
    !Array.isArray(lista[0]) &&
    !(lista[0] instanceof Date)
  ) {
    return lista[0];
  }
  return lista;
}

const num = (v) => (typeof v === 'bigint' ? Number(v) : v);

/** Monta a API .get/.all/.run em cima de um executor (client ou transação). */
function fazerPrepare(executar) {
  return (sql) => ({
    async get(...p) {
      const r = await executar({ sql, args: paraArgs(p) });
      return r.rows[0];
    },
    async all(...p) {
      const r = await executar({ sql, args: paraArgs(p) });
      return r.rows;
    },
    async run(...p) {
      const r = await executar({ sql, args: paraArgs(p) });
      return { changes: num(r.rowsAffected), lastInsertRowid: num(r.lastInsertRowid) };
    },
  });
}

/**
 * Camada fininha com a mesma cara do better-sqlite3, só que ASSÍNCRONA:
 *   await db.prepare(sql).get(params) / .all(params) / .run(params)
 *   await db.exec(sqlComVariasInstrucoes)
 *   await db.transacao(async (tx) => { ...usa tx.prepare... })
 */
export const db = {
  prepare: fazerPrepare((opts) => client.execute(opts)),
  async exec(sql) {
    await client.executeMultiple(sql);
  },
  async transacao(fn) {
    const tx = await client.transaction('write');
    const tdb = {
      prepare: fazerPrepare((opts) => tx.execute(opts)),
      async exec(sql) { await tx.executeMultiple(sql); },
    };
    try {
      const resultado = await fn(tdb);
      await tx.commit();
      return resultado;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  },
};

// Migrations pendentes são aplicadas no start (top-level await), então o banco
// nunca fica atrás do código antes do servidor começar a atender.
export const versaoSchema = await migrar(db);
