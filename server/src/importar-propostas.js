import ExcelJS from 'exceljs';
import { norm } from './importar-coordenadores.js';

function celulaTexto(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    if (v instanceof Date) {
      const p = (n) => String(n).padStart(2, '0');
      return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
    }
    return '';
  }
  return String(v);
}

function acharColuna(cabecalho, padroes) {
  for (const padrao of padroes) {
    const i = cabecalho.findIndex((c) => padrao.test(norm(c)));
    if (i !== -1) return i;
  }
  return -1;
}

/** "30/09/2026" -> "2026-09-30". Aceita também já-ISO. '' se não der. */
function paraIso(bruto) {
  const s = String(bruto ?? '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return '';
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  if (dt.getUTCDate() !== Number(d) || dt.getUTCMonth() + 1 !== Number(mo)) return '';
  return iso;
}

/** Último trecho do endereço costuma ser o bairro ("Rua X, 601, Vila Y" -> "Vila Y"). */
function bairroDoEndereco(endereco) {
  const partes = String(endereco ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (partes.length < 2) return '';
  const ultimo = partes[partes.length - 1];
  // Se o último trecho é só um número (ex.: CEP), tenta o anterior.
  if (/^\d[\d\s-]*$/.test(ultimo) && partes.length >= 3) return partes[partes.length - 2];
  return ultimo;
}

/**
 * Lê a planilha de PROPOSTAS/reuniões pretendidas (uma linha por proposta).
 * Colunas reconhecidas por nome, em qualquer ordem — casa com a aba "Reuniões"
 * do gabinete: Deputado/Parceiro, Coordenador Responsável, Liderança, Telefone,
 * Data, Horário, Endereço, Quantidade de Pessoas.
 *
 * O bairro/região sai de uma coluna própria; se não houver, do fim do endereço.
 *
 * @returns {{ok:true, linhas:Array}|{ok:false, erro:string}}
 */
export async function lerPlanilhaPropostas(buffer, { nomeArquivo = '' } = {}) {
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
    const coord = acharColuna(linha, [/coordenador/, /proponente/, /responsavel/]);
    const end = acharColuna(linha, [/^endereco$/, /endereço/, /^local$/]);
    if (coord !== -1 || end !== -1) {
      idx = i;
      col = {
        coord,
        lideranca: acharColuna(linha, [/lideranca/, /liderança/, /^lider/]),
        telefone: acharColuna(linha, [/telefone/, /^fone/, /contato/, /whats/, /celular/]),
        candidato: acharColuna(linha, [/deputado/, /parceiro/, /candidato/]),
        bairro: acharColuna(linha, [/^bairro$/, /bairro/, /regiao/, /região/]),
        endereco: end,
        data: acharColuna(linha, [/^data/, /data/]),
        hora: acharColuna(linha, [/hor[aá]rio/, /^hora/]),
        publico: acharColuna(linha, [/quantidade/, /publico/, /público/, /pessoas/, /previsao/]),
        obs: acharColuna(linha, [/observa/, /^obs/]),
      };
      break;
    }
  }

  if (idx === -1) {
    return {
      ok: false,
      erro:
        'Não encontrei o cabeçalho. A planilha precisa ter ao menos uma coluna de ' +
        '"Coordenador" (ou proponente) ou "Endereço".',
    };
  }

  const pega = (linha, i) => (i !== -1 ? (linha[i] ?? '').trim() : '');

  const linhas = [];
  for (let i = idx + 1; i < matriz.length; i++) {
    const linha = matriz[i];
    const coord = pega(linha, col.coord);
    const lider = pega(linha, col.lideranca);
    const endereco = pega(linha, col.endereco);
    const proponente = coord || lider;
    // Linha vazia de verdade: sem quem propôs e sem endereço.
    if (!proponente && !endereco) continue;

    const hora = pega(linha, col.hora);
    const horaOk = /^\d{1,2}:\d{2}$/.test(hora)
      ? `${hora.split(':')[0].padStart(2, '0')}:${hora.split(':')[1]}`
      : null;
    const pub = (pega(linha, col.publico).match(/\d+/) || [])[0];
    const bairro = pega(linha, col.bairro) || bairroDoEndereco(endereco) || 'A definir';

    linhas.push({
      proponente: proponente || 'A definir',
      coordenador: coord || null,
      // Liderança é campo próprio; só vira proponente quando não há coordenador.
      lideranca: coord ? (lider || null) : null,
      telefone: pega(linha, col.telefone) || null,
      candidato: pega(linha, col.candidato) || null,
      bairro,
      endereco: endereco || null,
      data_sugerida: paraIso(pega(linha, col.data)) || null,
      hora: horaOk,
      publico: pub ? Number(pub) : null,
      observacoes: pega(linha, col.obs) || null,
    });
  }

  return { ok: true, linhas };
}
