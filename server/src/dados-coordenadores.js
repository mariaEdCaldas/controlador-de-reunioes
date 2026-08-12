/**
 * Carga real de coordenadores (planilha "Pasta1 - Planilha1").
 *
 * Esta lista é plana: cada coordenador tem nome, bairro, endereço, telefone e
 * rede social — sem time. Os times continuam existindo como cadastro próprio;
 * o vínculo de coordenador a time é feito na tela de Times, se quiser.
 *
 * Telefones vão como estão; a normalização (55 + DDD + número) é feita ao
 * gravar. Quem tem dois números entra com o primeiro.
 */
import { normalizarTelefone } from './telefone.js';

export const COORDENADORES = [
  { nome: 'Nilson Amêndola', bairro: 'Coophavilla 2', endereco: 'Rua Maracaibo nº240', telefone: '(67) 99140-1021', rede_social: '' },
  { nome: 'Marcelo da Silva Souza', bairro: 'Coophavilla 2', endereco: 'Rua do Cabo, 166', telefone: '(67) 98184-1313', rede_social: 'marceloquintaldoacaraje' },
  { nome: 'Maurilho Sebastião Nogueira', bairro: 'Vila Kellen', endereco: 'Travessa do Golfinho nº204', telefone: '(67) 99245-6951', rede_social: '' },
  { nome: 'Maria Socorro da Costa', bairro: 'Tarumã', endereco: 'Av. Bom Progresso, 143', telefone: '(67) 99180-2101', rede_social: '' },
  { nome: 'Admilson Rodrigues Amorim', bairro: 'Bonjardim', endereco: 'Rua dos Pássaros n 520', telefone: '(67) 99117-3265', rede_social: '@admilson_amorim' },
  { nome: 'Fátima Socorro Rocha Lima', bairro: 'Santa Emília', endereco: 'Santa Bertilha 734, CEP 79.093-390', telefone: '(67) 99150-9363', rede_social: '' },
  { nome: 'Ary Moreira de Almeida', bairro: 'Caiçara', endereco: 'Rua Vital Brasil 267', telefone: '(67) 99327-4767', rede_social: '@arymoreiraalmeida' },
  { nome: 'Milton Spati', bairro: 'Tarumã', endereco: 'Rua da Enseada', telefone: '(67) 99205-2923', rede_social: '@milton_spati' },
  { nome: 'Rosangela Boa Ventura de Oliveira', bairro: 'Tarumã', endereco: 'Rua Acaia n 1976', telefone: '(67) 99288-1393', rede_social: 'rosangelaboaventura@gmail.com' },
  { nome: 'Jaqueline Espatti Pedrosa', bairro: 'Jd Penfico', endereco: 'Rua João Batista Oliveira de Souza 271', telefone: '(67) 99156-4416', rede_social: '@jaquelinespattipedrosa' },
  { nome: 'George Santana (Personal)', bairro: 'Coophavila 2', endereco: 'Rua da Praia 1226', telefone: '(67) 99276-8966', rede_social: '@nutrifit.georgesantana' },
  { nome: 'Noemi dos Santos Ribeiro (petshop)', bairro: 'Tijuca', endereco: 'Rua Souto maior 1777', telefone: '(67) 98192-6454', rede_social: '@dobruto.petshop' },
  { nome: 'Douglas Dias (farmácia)', bairro: 'Coophavilla', endereco: 'Rua da Praia 1226', telefone: '(67) 98195-4620', rede_social: '@duarte_dias28' },
  { nome: 'Rosana Amorim', bairro: 'Vila Anahy', endereco: 'Rua dos Arquitetos n°35', telefone: '(67) 99661-6078', rede_social: '@rosana.amorim.180' },
  { nome: 'Lucia Gonçalves', bairro: 'Caiçara', endereco: 'Rua dos Arquitetos n 205', telefone: '(67) 99305-2619', rede_social: '@lg_goncalves' },
  { nome: 'Silvio Cesar Gomes de Oliveira', bairro: 'Coophavilla 2', endereco: 'Rua do Cabo, 126', telefone: '(67) 99290-0333', rede_social: '@silviocesargomesdeoliveira' },
  { nome: 'Jair Serafim', bairro: 'Coophavilla 2', endereco: 'Rua do Cabo, 196', telefone: '(67) 98407-4349', rede_social: '@serafim.jair' },
  { nome: 'Helaine Bitencourt Coimbra', bairro: 'Vila Progresso', endereco: 'Rua São Cosme e Damião, 977', telefone: '(67) 99180-2101', rede_social: '@helainebitencourt' },
];

/**
 * Insere os coordenadores da carga. Por padrão só roda se a tabela estiver
 * vazia; com `forcar`, apaga TODOS os coordenadores e recarrega estes.
 *
 * @returns {{ coordenadores: number, semTelefone: number } | { pulou: true }}
 */
export function cargaCoordenadores(db, { forcar = false } = {}) {
  const jaTem = db.prepare('SELECT COUNT(*) AS n FROM coordenadores').get().n;
  if (jaTem > 0 && !forcar) return { pulou: true };

  let semTelefone = 0;

  const carregar = db.transaction(() => {
    if (forcar) {
      db.exec('DELETE FROM coordenadores;');
      db.exec(`DELETE FROM sqlite_sequence WHERE name = 'coordenadores';`);
    }

    const inserir = db.prepare(
      `INSERT INTO coordenadores (nome, telefone, bairro, endereco, rede_social, time_id)
       VALUES (@nome, @telefone, @bairro, @endereco, @rede_social, NULL)`
    );
    for (const c of COORDENADORES) {
      const tel = normalizarTelefone(c.telefone);
      if (!tel.ok) semTelefone += 1;
      inserir.run({
        nome: c.nome,
        telefone: tel.ok ? tel.telefone : null,
        bairro: c.bairro || null,
        endereco: c.endereco || null,
        rede_social: c.rede_social || null,
      });
    }
  });

  carregar();

  return {
    coordenadores: db.prepare('SELECT COUNT(*) AS n FROM coordenadores').get().n,
    semTelefone,
  };
}
