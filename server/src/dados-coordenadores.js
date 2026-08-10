/**
 * Carga real de times e coordenadores, extraida da planilha
 * "COORDENADORES SÁBADO 08-08-2026".
 *
 * Cada coordenador pertence a um time (ROM, JVE, MAC, CBE, EGI, VIV). Os nomes
 * dos times sao os codigos da planilha — podem ser renomeados na tela de Times.
 *
 * Telefones vao como estao na planilha; a normalizacao (55 + DDD + numero) é
 * feita na hora de gravar. Quem tiver dois numeros, entra o primeiro.
 */
import { normalizarTelefone } from './telefone.js';

export const TIMES = ['ROM', 'JVE', 'MAC', 'CBE', 'EGI', 'VIV'];

export const COORDENADORES = [
  // ROM
  { nome: 'Pr. Daniel', telefone: '(67) 99103-7518', time: 'ROM' },
  { nome: 'Ricardo Oliveira', telefone: '(67) 99641-1090', time: 'ROM' },
  { nome: 'Dayane Alves Barbosa', telefone: '(67) 99258-1090', time: 'ROM' },
  { nome: 'Walcleia Gonçalves França', telefone: '(67) 99976-6263', time: 'ROM' },
  { nome: 'Arthur Ribeiro Arce', telefone: '(67) 99187-4027', time: 'ROM' },

  // JVE (mesmas pessoas do time "Jaime Verruci" da outra planilha)
  { nome: 'Nilson Amêndola', telefone: '(67) 99140-1021', time: 'JVE' },
  { nome: 'Marcelo da Silva Souza', telefone: '(67) 98184-1313', time: 'JVE' },
  { nome: 'Maurilho Sebastião Nogueira', telefone: '(67) 99245-6951', time: 'JVE' },
  { nome: 'Maria Socorro da Costa', telefone: '(67) 99180-2101', time: 'JVE' },
  { nome: 'Admilson Rodrigues Amorim', telefone: '(67) 99117-3265', time: 'JVE' },
  { nome: 'Fátima Socorro Rocha Lima', telefone: '(67) 99150-9363', time: 'JVE' },
  { nome: 'Ary Moreira de Almeida', telefone: '(67) 99327-4767', time: 'JVE' },
  { nome: 'Milton Spati', telefone: '(67) 99205-2923', time: 'JVE' },
  { nome: 'Rosangela Boa Ventura de Oliveira', telefone: '(67) 99288-1393', time: 'JVE' },
  { nome: 'Jaqueline E. Pedrosa', telefone: '(67) 99156-4416', time: 'JVE' },
  { nome: 'George Santana (Personal)', telefone: '(67) 99276-8966', time: 'JVE' },
  { nome: 'Noemi dos Santos Ribeiro (petshop)', telefone: '(67) 98192-6454', time: 'JVE' },
  { nome: 'Douglas Dias (farmácia)', telefone: '(67) 98195-4620', time: 'JVE' },
  { nome: 'Rosana Amorim', telefone: '(67) 99661-6078', time: 'JVE' },
  { nome: 'Lucia Gonçalves', telefone: '(67) 99305-2619', time: 'JVE' },
  { nome: 'Silvio Cesar Gomes de Oliveira', telefone: '(67) 99290-0333', time: 'JVE' },
  { nome: 'Jair Serafim', telefone: '(67) 98407-4349', time: 'JVE' },
  { nome: 'Helaine Bitencourt', telefone: '(67) 99180-2101', time: 'JVE' },

  // MAC
  { nome: 'Rosemary do Nascimento Andrade e Silva', telefone: '(67) 99686-0641', time: 'MAC' },
  { nome: 'Natalia Batista de Souza', telefone: '(67) 99248-3638', time: 'MAC' },
  { nome: 'Paola Portilho', telefone: '(67) 99662-5036', time: 'MAC' },
  { nome: 'Tony (Cabeleireiro)', telefone: '(67) 99965-0133', time: 'MAC' },
  { nome: 'Admilla Candida Mauyama dos Santos', telefone: '(67) 99339-3149', time: 'MAC' },
  { nome: 'Luciana (Síndica)', telefone: '(67) 99191-9580', time: 'MAC' },
  { nome: 'Paulo Celso Gil Leite (PM)', telefone: '(67) 99299-9782', time: 'MAC' },
  { nome: 'Cleiton Alves Ferreira', telefone: '(67) 98105-5188', time: 'MAC' },
  { nome: 'Cel Monari', telefone: '(67) 98111-7026', time: 'MAC' },
  { nome: 'Thiago (Atlética de Medicina)', telefone: '(67) 98103-7556', time: 'MAC' },
  { nome: 'Jarine Cortez (Time ALEMS)', telefone: '(67) 98118-1415', time: 'MAC' },

  // CBE
  { nome: 'Bahiano', telefone: '(67) 99205-5394', time: 'CBE' },
  { nome: 'Liliane da Silva Freitas', telefone: '(67) 99134-4397', time: 'CBE' },
  { nome: 'Vania da Silva Marques', telefone: '(67) 99113-8949', time: 'CBE' },
  { nome: 'Raphael da Silva Goularte', telefone: '(67) 99185-6375', time: 'CBE' },
  { nome: 'Walfrida', telefone: '(67) 99105-4111', time: 'CBE' },
  { nome: 'Ana Luiza de Almeida Rodrigues', telefone: '(67) 99943-7651', time: 'CBE' },
  { nome: 'Marislei Aparecida Moreira', telefone: '(67) 99208-3190', time: 'CBE' },
  { nome: 'Ademar de Lima Oliveira', telefone: '(67) 98123-3784', time: 'CBE' },

  // EGI
  { nome: 'José Carlos Mira', telefone: '(67) 98121-3393', time: 'EGI' },
  { nome: 'Giuliana Claudia de Moraes Vaz Souza', telefone: '(67) 99103-6031', time: 'EGI' },
  { nome: 'Diego da Silva Souza', telefone: '(67) 99195-5854', time: 'EGI' },
  { nome: 'Eliane Batista de Lima', telefone: '(67) 99125-7616', time: 'EGI' },
  { nome: 'Aryana da Silva Moura', telefone: '(67) 99823-1706', time: 'EGI' },
  { nome: 'Ricardo Ortiz', telefone: '(67) 99266-9469', time: 'EGI' },
  { nome: 'Mário Celso Souza dos Santos', telefone: '(67) 99830-8503', time: 'EGI' },
  { nome: 'Abigail da Silva', telefone: '(67) 99200-6152', time: 'EGI' },
  { nome: 'Nilton Cesar Gonçalves Filho', telefone: '(67) 99178-0500', time: 'EGI' },

  // VIV
  { nome: 'David Gouveia', telefone: '(67) 99281-8681', time: 'VIV' },
  { nome: 'Samantha Alves de Melo', telefone: '(67) 98419-9708', time: 'VIV' },
  { nome: 'Vania Felícia da Silva', telefone: '(67) 99164-3348', time: 'VIV' },
  { nome: 'Luiza Paula Terra', telefone: '(67) 99985-6137', time: 'VIV' },
  { nome: 'Allan Martins', telefone: '(67) 99236-6006', time: 'VIV' },
  { nome: 'Claudinha (Abrec)', telefone: '(67) 9815-3754', time: 'VIV' },
];

/**
 * Insere os times e coordenadores da carga. Idempotente: por padrao so roda se
 * a tabela de coordenadores estiver vazia. Com `forcar`, apaga e recria.
 *
 * @returns {{ times: number, coordenadores: number, semTelefone: number } | { pulou: true }}
 */
export function cargaCoordenadores(db, { forcar = false } = {}) {
  const jaTem = db.prepare('SELECT COUNT(*) AS n FROM coordenadores').get().n;
  if (jaTem > 0 && !forcar) return { pulou: true };

  let semTelefone = 0;

  const carregar = db.transaction(() => {
    if (forcar) {
      db.exec('DELETE FROM coordenadores; DELETE FROM times;');
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('coordenadores', 'times');`);
    }

    const inserirTime = db.prepare('INSERT INTO times (nome) VALUES (?)');
    const idPorTime = new Map();
    for (const nome of TIMES) {
      const { lastInsertRowid } = inserirTime.run(nome);
      idPorTime.set(nome, lastInsertRowid);
    }

    const inserirCoord = db.prepare(
      'INSERT INTO coordenadores (nome, telefone, time_id) VALUES (@nome, @telefone, @time_id)'
    );
    for (const c of COORDENADORES) {
      const tel = normalizarTelefone(c.telefone);
      if (!tel.ok) semTelefone += 1;
      inserirCoord.run({
        nome: c.nome,
        telefone: tel.ok ? tel.telefone : null,
        time_id: idPorTime.get(c.time) ?? null,
      });
    }
  });

  carregar();

  return {
    times: db.prepare('SELECT COUNT(*) AS n FROM times').get().n,
    coordenadores: db.prepare('SELECT COUNT(*) AS n FROM coordenadores').get().n,
    semTelefone,
  };
}
