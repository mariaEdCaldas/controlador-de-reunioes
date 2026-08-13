import ExcelJS from 'exceljs';
import { normalizarTelefone } from './telefone.js';
import { norm } from './importar-coordenadores.js';

/** Converte o valor de uma célula do exceljs em texto simples. */
function celulaTexto(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    if (v instanceof Date) return v.toISOString();
    return '';
  }
  return String(v);
}

/** Acha, numa linha de cabeçalho, o índice da coluna que casa com algum padrão. */
function acharColuna(cabecalho, padroes) {
  for (const padrao of padroes) {
    const i = cabecalho.findIndex((c) => padrao.test(norm(c)));
    if (i !== -1) return i;
  }
  return -1;
}

/**
 * Lê uma planilha (.xlsx ou .csv) de CABOS. Colunas reconhecidas por nome, em
 * qualquer ordem (só "Nome" é obrigatório):
 *   Nome | Telefone | Bairro | Coordenador | Endereço | Rede social
 * A coluna Coordenador é o NOME do coordenador para vincular (Time -> Coord ->
 * Cabo). Como coordenador costuma vir mesclado, é "preenchido para baixo".
 *
 * @returns {{ok:true, linhas:Array}|{ok:false, erro:string}}
 */
export async function lerPlanilhaCabos(buffer, { nomeArquivo = '' } = {}) {
  const wb = new ExcelJS.Workbook();
  try {
    if (nomeArquivo.toLowerCase().endsWith('.csv')) {
      const { Readable } = await import('node:stream');
      await wb.csv.read(Readable.from(buffer.toString('utf8')));
    } else {
      await wb.xlsx.load(buffer);
    }
  } catch (e) {
    return { ok: false, erro: `Não consegui ler o arquivo (${e.message}). Ele é um .xlsx ou .csv válido?` };
  }

  const ws = wb.worksheets[0];
  if (!ws) return { ok: false, erro: 'A planilha está vazia.' };

  const matriz = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const valores = [];
    row.eachCell({ includeEmpty: true }, (cell) => valores.push(celulaTexto(cell.value)));
    matriz.push(valores);
  });

  let idx = -1;
  let col = {};
  for (let i = 0; i < Math.min(matriz.length, 15); i++) {
    const linha = matriz[i];
    const nome = acharColuna(linha, [/nome completo/, /^nome$/, /^cabo/]);
    const tel = acharColuna(linha, [/telefone/, /^fone/, /contato/, /whats/, /celular/, /^cel$/]);
    const bairro = acharColuna(linha, [/bairro/, /regiao/, /região/]);
    const coord = acharColuna(linha, [/coordenador/, /responsavel/, /^lider/, /líder/]);
    const endereco = acharColuna(linha, [/endereco/, /endereço/, /^rua/]);
    const rede = acharColuna(linha, [/rede social/, /instagram/, /@/, /perfil/]);
    if (nome !== -1) {
      idx = i;
      col = { nome, tel, bairro, coord, endereco, rede };
      break;
    }
  }

  if (idx === -1) {
    return {
      ok: false,
      erro:
        'Não encontrei o cabeçalho. A planilha precisa ter uma linha de títulos com ' +
        'pelo menos "Nome" (e, se quiser, Telefone, Bairro e Coordenador).',
    };
  }

  const pega = (linha, i) => (i !== -1 ? (linha[i] ?? '').trim() : '');

  const linhas = [];
  let ultimoCoord = '';
  for (let i = idx + 1; i < matriz.length; i++) {
    const linha = matriz[i];
    const nome = pega(linha, col.nome);
    if (!nome) continue;

    let coord = pega(linha, col.coord);
    if (coord) ultimoCoord = coord;
    else coord = ultimoCoord;

    const telBruto = pega(linha, col.tel).split(/[;\n]/)[0].trim();
    const tel = telBruto ? normalizarTelefone(telBruto) : { ok: false };

    linhas.push({
      nome,
      telefone: tel.ok ? tel.telefone : null,
      telefoneOriginal: telBruto || null,
      bairro: pega(linha, col.bairro) || null,
      coordenador: coord || null,
      endereco: pega(linha, col.endereco) || null,
      rede_social: pega(linha, col.rede) || null,
    });
  }

  return { ok: true, linhas };
}
