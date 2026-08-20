const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function segundaDaSemana(base) {
  const d = new Date(base);
  const dow = d.getDay(); // 0=dom
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d;
}

/** Calcula {ini, fim} (ISO) de um preset relativo a hoje. 'todas'/'custom' -> null. */
export function intervaloPreset(modo) {
  const hoje = new Date();
  if (modo === 'semana') {
    const s = segundaDaSemana(hoje);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { ini: iso(s), fim: iso(e) };
  }
  if (modo === 'proxima') {
    const s = segundaDaSemana(hoje); s.setDate(s.getDate() + 7);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { ini: iso(s), fim: iso(e) };
  }
  if (modo === 'mes') {
    const s = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const e = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { ini: iso(s), fim: iso(e) };
  }
  return null;
}

/** Filtra uma lista por período. `obterData` diz de onde tirar a data (ISO). */
export function filtrarPeriodo(itens, periodo, obterData = (x) => x.data) {
  if (!periodo || periodo.modo === 'todas') return itens;
  const { ini, fim } = periodo;
  if (!ini && !fim) return itens;
  return itens.filter((x) => {
    const d = obterData(x);
    if (!d) return false; // sem data não cai em nenhuma semana/mês
    if (ini && d < ini) return false;
    if (fim && d > fim) return false;
    return true;
  });
}

const OPCOES = [
  { modo: 'todas', rotulo: 'Todas as datas' },
  { modo: 'semana', rotulo: 'Esta semana' },
  { modo: 'proxima', rotulo: 'Próxima semana' },
  { modo: 'mes', rotulo: 'Este mês' },
  { modo: 'custom', rotulo: 'Período específico…' },
];

/**
 * Filtro de período: um seletor com atalhos (semana, próxima semana, mês) e a
 * opção de escolher um intervalo de datas. `periodo` = { modo, ini, fim }.
 */
export default function FiltroPeriodo({ periodo, aoMudar }) {
  function mudarModo(modo) {
    if (modo === 'custom') {
      aoMudar({ modo, ini: periodo.ini || '', fim: periodo.fim || '' });
    } else if (modo === 'todas') {
      aoMudar({ modo, ini: '', fim: '' });
    } else {
      aoMudar({ modo, ...intervaloPreset(modo) });
    }
  }

  return (
    <div className="filtro-periodo">
      <label className="filtro">
        📅{' '}
        <select value={periodo.modo} onChange={(e) => mudarModo(e.target.value)}>
          {OPCOES.map((o) => (
            <option key={o.modo} value={o.modo}>{o.rotulo}</option>
          ))}
        </select>
      </label>
      {periodo.modo === 'custom' && (
        <span className="filtro-periodo-datas">
          <input
            type="date"
            value={periodo.ini}
            onChange={(e) => aoMudar({ ...periodo, ini: e.target.value })}
            aria-label="De"
          />
          <span className="ate">até</span>
          <input
            type="date"
            value={periodo.fim}
            onChange={(e) => aoMudar({ ...periodo, fim: e.target.value })}
            aria-label="Até"
          />
        </span>
      )}
    </div>
  );
}
