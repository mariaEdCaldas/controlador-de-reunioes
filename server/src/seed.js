/**
 * Seed OPCIONAL - dados ficticios para testar o sistema (`npm run seed`).
 *
 * Nao roda sozinho no start: o banco de producao do gabinete comeca vazio.
 * Por padrao so popula se as tabelas estiverem vazias; use `npm run seed -- --force`
 * para apagar palestrantes/reunioes e recriar os exemplos.
 *
 * As regioes NAO estao aqui - sao dado de referencia, vem na migration 002.
 */
import { db, dbFile } from './db.js';

const forcar = process.argv.includes('--force');

const PALESTRANTES = [
  { nome: 'Marcos Andrade',   telefone: '5567999990001', regiao: 'Centro',          temas: 'Segurança pública, Emprego' },
  { nome: 'Cléia Ramires',    telefone: '5567999990002', regiao: 'Coophavila',      temas: 'Saúde da mulher, Assistência social' },
  { nome: 'João Bispo',       telefone: '5567999990003', regiao: 'Vila Progresso',  temas: 'Educação, Juventude' },
  { nome: 'Fernanda Melo',    telefone: '5567999990004', regiao: 'Tiradentes',      temas: 'Habitação, Direitos do consumidor' },
  { nome: 'Ronaldo Trindade', telefone: '5567999990005', regiao: 'Jardim Noroeste', temas: 'Agricultura familiar, Cooperativismo' },
];

const REUNIOES = [
  {
    local: 'Coopatrabalho',
    endereco: 'Rua das Garças, 1420',
    regiao: 'Coophavila',
    data: '2026-07-20',
    hora: '19:00',
    status: 'a_confirmar',
    // Titular sugerido pela regiao (Cléia mora na Coophavila) - RN-03.
    titular: 'Cléia Ramires',
    reserva: null,
    checklist_som: 0,
    checklist_cadeiras: 0,
    presentes: null,
  },
  {
    local: 'Associação de Moradores do Centro',
    endereco: 'Av. Marcelino Pires, 305',
    regiao: 'Centro',
    data: '2026-07-22',
    hora: '09:30',
    status: 'confirmada',
    titular: 'Marcos Andrade',
    reserva: 'Ronaldo Trindade', // RN-04: reserva caso o titular nao confirme.
    checklist_som: 1,
    checklist_cadeiras: 0,
    presentes: null,
  },
];

const contar = (tabela) =>
  db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get().n;

if (!forcar && (contar('palestrantes') > 0 || contar('reunioes') > 0)) {
  console.log('[seed] O banco já tem dados. Nada foi alterado.');
  console.log('[seed] Para apagar e recriar os exemplos: npm run seed -- --force');
  process.exit(0);
}

const idRegiao = (nome) => {
  const linha = db.prepare('SELECT id FROM regioes WHERE nome = ?').get(nome);
  if (!linha) throw new Error(`Região "${nome}" não existe na tabela regioes.`);
  return linha.id;
};

const popular = db.transaction(() => {
  if (forcar) {
    // Reunioes primeiro: elas referenciam palestrantes.
    db.exec('DELETE FROM reunioes; DELETE FROM palestrantes;');
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('reunioes', 'palestrantes');`);
  }

  const inserirPalestrante = db.prepare(`
    INSERT INTO palestrantes (nome, telefone, regiao_id, temas, ativo)
    VALUES (@nome, @telefone, @regiao_id, @temas, 1)
  `);

  const idsPorNome = new Map();
  for (const p of PALESTRANTES) {
    const { lastInsertRowid } = inserirPalestrante.run({
      nome: p.nome,
      telefone: p.telefone,
      regiao_id: idRegiao(p.regiao),
      temas: p.temas,
    });
    idsPorNome.set(p.nome, lastInsertRowid);
  }

  const inserirReuniao = db.prepare(`
    INSERT INTO reunioes (
      local, endereco, regiao_id, data, hora, status,
      titular_id, reserva_id, checklist_som, checklist_cadeiras, presentes
    ) VALUES (
      @local, @endereco, @regiao_id, @data, @hora, @status,
      @titular_id, @reserva_id, @checklist_som, @checklist_cadeiras, @presentes
    )
  `);

  for (const r of REUNIOES) {
    inserirReuniao.run({
      local: r.local,
      endereco: r.endereco,
      regiao_id: idRegiao(r.regiao),
      data: r.data,
      hora: r.hora,
      status: r.status,
      titular_id: r.titular ? idsPorNome.get(r.titular) : null,
      reserva_id: r.reserva ? idsPorNome.get(r.reserva) : null,
      checklist_som: r.checklist_som,
      checklist_cadeiras: r.checklist_cadeiras,
      presentes: r.presentes,
    });
  }
});

popular();

console.log(`[seed] Banco: ${dbFile}`);
console.log(`[seed] ${contar('regioes')} regiões (da migration)`);
console.log(`[seed] ${contar('palestrantes')} palestrantes de exemplo inseridos`);
console.log(`[seed] ${contar('reunioes')} reuniões de exemplo inseridas`);
