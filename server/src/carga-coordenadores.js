/**
 * Carrega a carga real de times e coordenadores (`npm run carga`).
 *
 * Idempotente: por padrao so popula se ainda nao houver coordenadores.
 * Use `npm run carga -- --force` para apagar e recarregar do zero.
 */
import { db, dbFile } from './db.js';
import { cargaCoordenadores } from './dados-coordenadores.js';

const forcar = process.argv.includes('--force');
const r = cargaCoordenadores(db, { forcar });

console.log(`[carga] Banco: ${dbFile}`);
if (r.pulou) {
  console.log('[carga] Já existem coordenadores. Nada foi alterado.');
  console.log('[carga] Para apagar e recarregar: npm run carga -- --force');
} else {
  console.log(`[carga] ${r.times} times e ${r.coordenadores} coordenadores carregados.`);
  if (r.semTelefone > 0) {
    console.log(`[carga] ${r.semTelefone} sem telefone válido (ficaram sem número).`);
  }
}
