/**
 * Aplica as migrations pendentes sem subir o servidor (`npm run migrate`).
 * O `npm run dev` ja faz isso sozinho no start - este script existe para
 * rodar/conferir as migrations isoladamente.
 */
import { dbFile, versaoSchema, db } from './db.js';

const aplicadas = db
  .prepare('SELECT numero, nome, aplicada_em FROM migracoes ORDER BY numero')
  .all();

console.log(`[db] Banco: ${dbFile}`);
console.log(`[db] Versão do schema: ${versaoSchema}`);
console.log('[db] Migrations aplicadas:');
for (const m of aplicadas) {
  console.log(`      ${String(m.numero).padStart(3, '0')}  ${m.nome}  (${m.aplicada_em})`);
}
