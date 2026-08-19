import ExcelJS from 'exceljs';
import { norm } from './importar-coordenadores.js';
import { normalizarTelefone } from './telefone.js';

// Deputados conhecidos (mesma grafia dos CANDIDATOS do front, para o vínculo
// casar com o <select> da Nova Reunião). Paulo Corrêa é o fixo — não conta.
const DEPUTADOS = [
  'Mara Caseiro', 'Beto Pereira', 'Carlos Bernardo', 'Rose Modesto',
  'Jaime Verruck', 'Giroto', 'Luana Ruiz', 'Viviane Luiza',
];

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

function acharColuna(cabecalho, padroes) {
  for (const padrao of padroes) {
    const i = cabecalho.findIndex((c) => padrao.test(norm(c)));
    if (i !== -1) return i;
  }
  return -1;
}

/** Do texto "MARA CASEIRO, PAULO CORRÊA" tira o deputado (o que não é o Paulo). */
function acharDeputado(texto) {
  const partes = String(texto ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  // 1ª passada: prefere um deputado conhecido (robusto a ordem/OCR do "Paulo").
  for (const p of partes) {
    const canon = DEPUTADOS.find((d) => norm(d) === norm(p));
    if (canon) return canon;
  }
  // 2ª passada: o primeiro que não seja o Paulo, em Maiúscula Inicial.
  for (const p of partes) {
    if (norm(p).startsWith('paul')) continue;
    return p.toLowerCase().replace(/(^|\s|')\p{L}/gu, (m) => m.toUpperCase());
  }
  return null;
}

/**
 * Lê a planilha "CONTROLE CADASTROS" do gabinete (uma aba por deputado), no
 * formato original: uma coluna Função (Coordenador/Cabo Eleitoral), os cabos
 * vêm logo abaixo do seu coordenador, e "Candidatos vinculados" diz o deputado.
 *
 * Monta a hierarquia sozinha: cada linha "Coordenador" abre um grupo; as linhas
 * "Cabo Eleitoral" seguintes pertencem a ele até o próximo coordenador. O tempo
 * (time) e o deputado vinculado saem da coluna "Candidatos vinculados".
 *
 * @returns {{ok:true, linhas:Array}|{ok:false, erro:string}}
 */
export async function lerPlanilhaCadastros(buffer, { nomeArquivo = '' } = {}) {
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

  // Acha o cabeçalho: a linha (nas 15 primeiras) com "Função" e "Nome".
  let idx = -1;
  let col = {};
  for (let i = 0; i < Math.min(matriz.length, 15); i++) {
    const linha = matriz[i];
    const funcao = acharColuna(linha, [/^funcao$/, /funcao/, /^função$/]);
    const nome = acharColuna(linha, [/^nome$/, /nome completo/]);
    if (funcao !== -1 && nome !== -1) {
      idx = i;
      col = {
        funcao,
        nome,
        tel: acharColuna(linha, [/telefone/, /^fone/, /contato/, /whats/, /celular/]),
        bairro: acharColuna(linha, [/^bairro$/, /bairro/]),
        endereco: acharColuna(linha, [/^endereco$/, /endereço/, /logradouro/]),
        numero: acharColuna(linha, [/^numero$/, /^número$/, /^n[º°]$/]),
        complemento: acharColuna(linha, [/complemento/]),
        rede: acharColuna(linha, [/usuario.*rede|link.*rede|rede.*social.*usuario/, /^usuario/, /perfil/, /instagram/]),
        candidatos: acharColuna(linha, [/candidato/]),
      };
      break;
    }
  }

  if (idx === -1) {
    return {
      ok: false,
      erro:
        'Não encontrei o cabeçalho. A planilha precisa ter as colunas do gabinete — ' +
        'pelo menos "Função" e "Nome" (e, de preferência, Telefone, Bairro, Endereço e "Candidatos vinculados").',
    };
  }

  const pega = (linha, i) => (i !== -1 ? (linha[i] ?? '').trim() : '');
  const montaEndereco = (linha) => {
    const rua = pega(linha, col.endereco);
    const num = pega(linha, col.numero);
    const comp = pega(linha, col.complemento);
    return [rua && num ? `${rua}, ${num}` : rua, comp].filter(Boolean).join(' - ') || null;
  };

  const linhas = [];
  let ultimoCoord = '';
  for (let i = idx + 1; i < matriz.length; i++) {
    const linha = matriz[i];
    const nome = pega(linha, col.nome);
    if (!nome) continue;

    const ehCoord = /coorden/.test(norm(pega(linha, col.funcao)));
    const telBruto = pega(linha, col.tel).split(/[;\n]/)[0].trim();
    const tel = telBruto ? normalizarTelefone(telBruto) : { ok: false };
    const deputado = acharDeputado(pega(linha, col.candidatos));

    if (ehCoord) ultimoCoord = nome;

    linhas.push({
      tipo: ehCoord ? 'coordenador' : 'cabo',
      nome,
      telefone: tel.ok ? tel.telefone : null,
      telefoneOriginal: telBruto || null,
      bairro: pega(linha, col.bairro) || null,
      endereco: montaEndereco(linha),
      rede_social: pega(linha, col.rede) || null,
      candidato: deputado,          // só usado no coordenador (vínculo/time)
      coordenador: ehCoord ? null : (ultimoCoord || null),
    });
  }

  return { ok: true, linhas };
}
