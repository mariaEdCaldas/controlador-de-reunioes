import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, 'migrations');

/**
 * Aplica as migrations ainda não rodadas, em ordem de número.
 *
 * Cada arquivo em src/migrations/ segue o padrão "001_descricao.sql". O número
 * já aplicado fica registrado na tabela `migracoes`, então rodar duas vezes não
 * repete nada. Novos módulos = novo arquivo com número maior.
 *
 * @returns {Promise<number>} número da última migration aplicada (versão do schema)
 */
export async function migrar(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migracoes (
      numero INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      aplicada_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const jaAplicadas = new Set(
    (await db.prepare('SELECT numero FROM migracoes').all()).map((m) => Number(m.numero))
  );

  const arquivos = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const numero = Number.parseInt(arquivo.slice(0, 3), 10);
    if (Number.isNaN(numero)) {
      throw new Error(`Migration com nome inválido: "${arquivo}" (esperado: 001_descricao.sql)`);
    }
    if (jaAplicadas.has(numero)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, arquivo), 'utf8');
    await db.exec(sql);
    await db.prepare('INSERT INTO migracoes (numero, nome) VALUES (?, ?)').run(numero, arquivo);
    console.log(`[db] migration aplicada: ${arquivo}`);
  }

  const { versao } = await db
    .prepare('SELECT COALESCE(MAX(numero), 0) AS versao FROM migracoes')
    .get();
  return Number(versao);
}
