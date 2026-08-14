import {
  REGIAO_COR, REGIAO_ROTULO, REGIOES_LEGENDA, regiaoDaReuniao, textoSobre,
} from './regioesCampoGrande.js';
import { formatarData } from './regioes.js';

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MESES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];
const COR_SEM_REGIAO = '#d7dccf';
const pad = (n) => String(n).padStart(2, '0');

// Meses fixos da campanha (sempre visíveis, mesmo sem reunião marcada). Se
// houver reunião fora desse intervalo, o calendário se estende para incluí-la.
const CAMPANHA_INI = '2026-08';
const CAMPANHA_FIM = '2026-10';

const corDaRegiao = (regiao) =>
  regiao === 'Sem região' ? COR_SEM_REGIAO : REGIAO_COR[regiao] || COR_SEM_REGIAO;

/** Fundo do dia: sólido (1 região) ou faixas diagonais (mais de uma no mesmo dia). */
function fundoDoDia(regioes) {
  if (regioes.length === 1) return corDaRegiao(regioes[0]);
  const cores = regioes.map(corDaRegiao);
  const passo = 100 / cores.length;
  const paradas = cores.map((c, i) => `${c} ${i * passo}% ${(i + 1) * passo}%`).join(', ');
  return `linear-gradient(135deg, ${paradas})`;
}

/** Lista de meses {ano, mes(0-11)} do primeiro ao último ISO (com trava de 24). */
function enumerarMeses(isoIni, isoFim) {
  const [ai, mi] = isoIni.split('-').map(Number);
  const [af, mf] = isoFim.split('-').map(Number);
  const meses = [];
  let ano = ai;
  let mes = mi - 1;
  for (let guarda = 0; guarda < 24; guarda++) {
    meses.push({ ano, mes });
    if (ano === af && mes === mf - 1) break;
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  return meses;
}

/**
 * Calendário que pinta cada dia com a cor da(s) região(ões) das reuniões daquele
 * dia — a região vem do bairro de cada reunião (mesma lógica da agenda por
 * região). Atualiza sozinho conforme as reuniões são cadastradas.
 */
export default function CalendarioRegioes({ reunioes }) {
  const porDia = new Map(); // ISO -> { regioes: [], itens: [] }
  for (const r of reunioes) {
    if (!r.data) continue;
    const reg = regiaoDaReuniao(r.regiao) ?? 'Sem região';
    if (!porDia.has(r.data)) porDia.set(r.data, { regioes: [], itens: [] });
    const e = porDia.get(r.data);
    if (!e.regioes.includes(reg)) e.regioes.push(reg);
    e.itens.push(r);
  }

  // Intervalo: sempre os meses da campanha; estende se houver reunião fora deles.
  const datas = [...porDia.keys()].sort();
  const primeiroMes = datas.length ? datas[0].slice(0, 7) : CAMPANHA_INI;
  const ultimoMes = datas.length ? datas[datas.length - 1].slice(0, 7) : CAMPANHA_FIM;
  const iniMes = primeiroMes < CAMPANHA_INI ? primeiroMes : CAMPANHA_INI;
  const fimMes = ultimoMes > CAMPANHA_FIM ? ultimoMes : CAMPANHA_FIM;
  const meses = enumerarMeses(`${iniMes}-01`, `${fimMes}-01`);

  return (
    <div className="cartao cal-regioes">
      <div className="cal-cabeca">
        <h2>Calendário por região</h2>
        <span className="sub">cada dia se pinta com a região das reuniões marcadas</span>
      </div>

      <div className="cal-meses">
        {meses.map(({ ano, mes }) => (
          <MesGrade key={`${ano}-${mes}`} ano={ano} mes={mes} porDia={porDia} />
        ))}
      </div>

      <ul className="cal-legenda">
        {REGIOES_LEGENDA.map((reg) => (
          <li key={reg}>
            <span className="cal-swatch" style={{ background: REGIAO_COR[reg] }} aria-hidden="true" />
            {REGIAO_ROTULO[reg]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MesGrade({ ano, mes, porDia }) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0=DOM
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d += 1) celulas.push(d);

  return (
    <div className="cal-mes">
      <div className="cal-mes-titulo">{MESES[mes]} {ano}</div>
      <div className="cal-semana">
        {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="cal-grade">
        {celulas.map((d, i) => {
          if (d === null) return <span key={i} className="cal-dia vazio" />;
          const iso = `${ano}-${pad(mes + 1)}-${pad(d)}`;
          const e = porDia.get(iso);
          if (!e) return <span key={i} className="cal-dia">{d}</span>;

          const fundo = fundoDoDia(e.regioes);
          const cor = e.regioes.length === 1 ? textoSobre(corDaRegiao(e.regioes[0])) : '#1c2b22';
          const titulo = e.itens
            .map((it) => `${it.hora || ''} ${it.nome || ''} — ${REGIAO_ROTULO[regiaoDaReuniao(it.regiao) ?? 'Sem região']}`.trim())
            .join('\n');

          return (
            <span
              key={i}
              className="cal-dia marcado"
              style={{ background: fundo, color: cor }}
              title={`${formatarData(iso)}\n${titulo}`}
            >
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}
