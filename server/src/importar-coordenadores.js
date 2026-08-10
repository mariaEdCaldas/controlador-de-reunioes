import ExcelJS from 'exceljs';
import { normalizarTelefone } from './telefone.js';

/** Tira acento e caixa, para comparar textos ("Telefone" == "telefone"). */
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Converte o valor de uma célula do exceljs em texto simples. */
function celulaTexto(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join('');
    if (v.text !== undefined) return String(v.text); // hyperlink
    if (v.result !== undefined) return String(v.result); // fórmula
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
 * Lê uma planilha (.xlsx ou .csv) e devolve as linhas de coordenadores.
 *
 * É tolerante com o formato real das planilhas do gabinete:
 *  - acha sozinho a linha de cabeçalho (ignora título e linhas em branco antes);
 *  - reconhece as colunas por nome (Nome, Telefone, Time), em qualquer ordem;
 *  - "preenche pra baixo" a coluna de time (nas planilhas ela vem mesclada, só
 *    a primeira linha de cada grupo tem o valor);
 *  - pega o primeiro número quando a célula tem dois telefones.
 *
 * @returns {{ok:true, linhas:Array}|{ok:false, erro:string}}
 */
export async function lerPlanilha(buffer, { nomeArquivo = '' } = {}) {
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

  // Matriz de textos: matriz[linha][coluna].
  const matriz = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const valores = [];
    row.eachCell({ includeEmpty: true }, (cell) => valores.push(celulaTexto(cell.value)));
    matriz.push(valores);
  });

  // Acha a linha de cabeçalho: a primeira (nas 15 iniciais) que tenha uma coluna
  // de nome e pelo menos uma de telefone ou time.
  let idxCab = -1;
  let colNome = -1;
  let colTel = -1;
  let colTime = -1;
  for (let i = 0; i < Math.min(matriz.length, 15); i++) {
    const linha = matriz[i];
    const nome = acharColuna(linha, [/^nome completo$/, /nome completo/, /^nome$/, /^coordenador/]);
    const tel = acharColuna(linha, [/telefone/, /^fone/, /contato/, /whats/, /celular/, /^cel$/]);
    const time = acharColuna(linha, [/^time$/, /equipe/, /^grupo/]);
    if (nome !== -1 && (tel !== -1 || time !== -1)) {
      idxCab = i;
      colNome = nome;
      colTel = tel;
      colTime = time;
      break;
    }
  }

  if (idxCab === -1) {
    return {
      ok: false,
      erro:
        'Não encontrei o cabeçalho. A planilha precisa ter uma linha com os títulos ' +
        'das colunas — pelo menos "Nome" e "Telefone" (e "Time", se quiser vincular).',
    };
  }

  const linhas = [];
  let ultimoTime = '';
  for (let i = idxCab + 1; i < matriz.length; i++) {
    const linha = matriz[i];
    const nome = (linha[colNome] ?? '').trim();
    if (!nome) continue; // linha em branco ou cabeçalho de seção sem nome

    // Time: se a célula veio vazia (mesclada), repete o último visto.
    let time = colTime !== -1 ? (linha[colTime] ?? '').trim() : '';
    if (time) ultimoTime = time;
    else time = ultimoTime;

    // Telefone: primeiro número, quando há dois na mesma célula.
    const telBruto = colTel !== -1 ? (linha[colTel] ?? '').split(/[;\n]/)[0].trim() : '';
    const tel = telBruto ? normalizarTelefone(telBruto) : { ok: false };

    linhas.push({
      nome,
      time: time || null,
      telefone: tel.ok ? tel.telefone : null,
      telefoneOriginal: telBruto || null,
    });
  }

  return { ok: true, linhas };
}
