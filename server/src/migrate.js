import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, 'migrations');

/**
 * Aplica as migrations ainda nao rodadas, em ordem de numero.
 *
 * Cada arquivo em src/migrations/ segue o padrao "001_descricao.sql".
 * O numero ja aplicado fica registrado na tabela `migracoes`, entao rodar
 * duas vezes nao repete nada. Novos modulos = novo arquivo com numero maior.
 *
 * @returns {number} numero da ultima migration aplicada (versao do schema)
 */
export function migrar(db, { silencioso = false } = {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migracoes (
      numero INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      aplicada_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const jaAplicadas = new Set(
    db.prepare('SELECT numero FROM migracoes').all().map((m) => m.numero)
  );

  const arquivos = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const registrar = db.prepare(
    'INSERT INTO migracoes (numero, nome) VALUES (?, ?)'
  );

  for (const arquivo of arquivos) {
    const numero = Number.parseInt(arquivo.slice(0, 3), 10);
    if (Number.isNaN(numero)) {
      throw new Error(
        `Migration com nome invalido: "${arquivo}" (esperado: 001_descricao.sql)`
      );
    }
    if (jaAplicadas.has(numero)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, arquivo), 'utf8');

    // Tudo dentro de uma transacao: se o SQL falhar no meio, nada e gravado
    // e a migration nao e marcada como aplicada.
    db.transaction(() => {
      db.exec(sql);
      registrar.run(numero, arquivo);
    })();

    if (!silencioso) console.log(`[db] migration aplicada: ${arquivo}`);
  }

  const { versao } = db
    .prepare('SELECT COALESCE(MAX(numero), 0) AS versao FROM migracoes')
    .get();

  return versao;
}
