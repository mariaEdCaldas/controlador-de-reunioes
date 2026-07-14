/**
 * APAGA o banco e recria do zero, do jeito que as migrations definem.
 * Uso: npm run db:reset -- --confirmar
 *
 * Destroi todos os dados. Exige a flag --confirmar justamente para nao
 * acontecer por engano (ex.: erro de digitacao no nome do script).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arquivo = path.resolve(__dirname, '..', 'data', 'agenda.db');

if (!process.argv.includes('--confirmar')) {
  console.log('[db:reset] Isto APAGA todos os dados do banco:');
  console.log(`           ${arquivo}`);
  console.log('[db:reset] Se é isso mesmo, rode: npm run db:reset -- --confirmar');
  process.exit(1);
}

// O modo WAL cria arquivos auxiliares; todos vao junto.
for (const f of [arquivo, `${arquivo}-wal`, `${arquivo}-shm`, `${arquivo}-journal`]) {
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    console.log(`[db:reset] apagado: ${path.basename(f)}`);
  }
}

// Importar db.js recria o arquivo e roda as migrations.
const { versaoSchema } = await import('./db.js');
console.log(`[db:reset] Banco recriado, schema na versão ${versaoSchema}.`);
console.log('[db:reset] Para repopular os exemplos: npm run seed');
