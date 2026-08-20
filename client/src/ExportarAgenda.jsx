import { useState } from 'react';
import { createPortal } from 'react-dom';
import { horaCurta } from './candidatos.js';
import { formatarTelefone } from './regioes.js';
import { regiaoDaReuniao, REGIAO_ROTULO } from './regioesCampoGrande.js';
import './impressao.css';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

const pad = (n) => String(n).padStart(2, '0');

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dataExtenso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(`${iso}T12:00:00Z`);
  return `${d} de ${MESES[m - 1]} de ${y} (${DIAS_SEMANA[dt.getUTCDay()]})`;
}
function addDias(iso, n) {
  const dt = new Date(`${iso}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function segundaDaSemana(iso) {
  const dt = new Date(`${iso}T12:00:00Z`);
  const dow = dt.getUTCDay(); // 0=dom
  return addDias(iso, dow === 0 ? -6 : 1 - dow);
}

function regiaoRotulo(r) {
  const k = regiaoDaReuniao(r.regiao);
  return String(REGIAO_ROTULO[k] || r.regiao || '').toUpperCase();
}
const mapsLink = (end) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${end}, Campo Grande - MS`)}`;

/** Título e linhas de uma reunião, no padrão da Agenda Capital. */
function partesReuniao(r, comEstrutura) {
  const reg = regiaoRotulo(r);
  const titulo =
    `${horaCurta(r.hora)}- REUNIÃO DEP. PAULO CORRÊA` +
    (r.candidato ? ` E DEP. ${r.candidato.toUpperCase()}` : '') +
    (reg ? ` (${reg})` : '');

  const linhas = [];
  const coordTel = r.coordenador_telefone ? ` - ${formatarTelefone(r.coordenador_telefone)}` : '';
  const respTel = r.responsavel_telefone ? ` - ${formatarTelefone(r.responsavel_telefone)}` : '';
  const coord = r.coordenador_nome || '';
  const resp = r.responsavel || '';
  if (coord && resp && resp.toLowerCase() !== coord.toLowerCase()) {
    // Coordenação e Responsável diferentes: duas linhas, cada um com seu telefone.
    linhas.push(['Coordenação: ', `${coord}${coordTel}`]);
    linhas.push(['Responsável: ', `${resp}${respTel || coordTel}`]);
  } else if (coord || resp) {
    linhas.push(['Coordenação/Responsável: ', `${coord || resp}${coordTel || respTel}`]);
  }
  if (comEstrutura && (r.qtd_cadeiras != null || r.tem_som)) {
    const partes = [];
    if (r.qtd_cadeiras != null) partes.push(`${r.qtd_cadeiras} cadeiras`);
    if (r.tem_som) partes.push('som');
    linhas.push(['', partes.join(' e '), 'estrutura']);
  }
  if (r.endereco) linhas.push(['Local: ', `${r.endereco}, Campo Grande - MS`]);
  linhas.push(['Link: ', mapsLink(r.endereco || ''), 'link']);
  const palestrante = r.palestrante || r.titular_nome;
  linhas.push([
    '',
    palestrante ? `Presença de palestrante - ${palestrante}` : 'Presença Dep. Paulo Corrêa',
    'presenca',
  ]);
  return { titulo, linhas };
}

/**
 * Exporta a agenda no padrão "Agenda Capital" — filtra por dia ou semana e sai
 * com ou sem a linha de estrutura (cadeiras/som). Imprime (Salvar PDF) ou copia
 * o texto para colar no WhatsApp.
 */
export default function ExportarAgenda({ reunioes, aoFechar }) {
  const [periodo, setPeriodo] = useState('semana'); // 'dia' | 'semana'
  const [dataBase, setDataBase] = useState(hojeISO());
  const [comEstrutura, setComEstrutura] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const ini = periodo === 'dia' ? dataBase : segundaDaSemana(dataBase);
  const fim = periodo === 'dia' ? dataBase : addDias(ini, 6);

  const doPeriodo = reunioes
    .filter((r) => r.data && r.data >= ini && r.data <= fim)
    .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || '').localeCompare(b.hora || ''));

  // Agrupa por dia, na ordem cronológica.
  const dias = [];
  for (const r of doPeriodo) {
    let g = dias.find((x) => x.data === r.data);
    if (!g) { g = { data: r.data, itens: [] }; dias.push(g); }
    g.itens.push(r);
  }

  function copiar() {
    const blocos = dias.map((g) => {
      const cab = dataExtenso(g.data);
      const reunioes = g.itens.map((r) => {
        const { titulo, linhas } = partesReuniao(r, comEstrutura);
        return [titulo, ...linhas.map(([rot, txt]) => `${rot}${txt}`)].join('\n');
      }).join('\n\n');
      return `${cab}\n\n${reunioes}`;
    }).join('\n\n\n');
    navigator.clipboard?.writeText(blocos).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="impressao-caixa" onClick={(e) => e.stopPropagation()}>
        <div className="impressao-acoes nao-imprimir agx-controles">
          <label className="agx-campo">
            Período
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="dia">Só o dia</option>
              <option value="semana">Semana toda</option>
            </select>
          </label>
          <label className="agx-campo">
            {periodo === 'dia' ? 'Dia' : 'Dia da semana'}
            <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} />
          </label>
          <label className="agx-campo agx-check">
            <input type="checkbox" checked={comEstrutura} onChange={(e) => setComEstrutura(e.target.checked)} />
            Com estrutura (cadeiras/som)
          </label>
          <div className="agx-botoes">
            <button className="botao" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar texto'}</button>
            <button className="botao primario" onClick={() => window.print()}>Imprimir / PDF</button>
            <button className="botao" onClick={aoFechar}>Fechar</button>
          </div>
        </div>

        <div className="folha agx-doc">
          <div className="folha-cabecalho">
            <div className="fc-agenda"><b>AGENDA</b><span>CAPITAL</span></div>
            <div className="fc-paulo">
              <small>DEPUTADO ESTADUAL</small>
              <b>PAULO CORRÊA</b>
            </div>
            <div className="fc-dupla"><span>22.222</span></div>
          </div>

          <div className="agx-corpo">
            {dias.length === 0 ? (
              <p className="agx-vazio nao-imprimir">Nenhuma reunião {periodo === 'dia' ? 'nesse dia' : 'nessa semana'}.</p>
            ) : (
              dias.map((g) => (
                <section className="agx-dia" key={g.data}>
                  <h2 className="agx-dia-titulo">{dataExtenso(g.data)}</h2>
                  {g.itens.map((r) => {
                    const { titulo, linhas } = partesReuniao(r, comEstrutura);
                    return (
                      <div className="agx-reuniao" key={r.id}>
                        <div className="agx-titulo">{titulo}</div>
                        {linhas.map(([rot, txt, tipo], i) => (
                          <div className={`agx-linha ${tipo || ''}`} key={i}>
                            {rot && <b>{rot}</b>}
                            {tipo === 'link' ? <a href={txt}>{txt}</a> : txt}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
