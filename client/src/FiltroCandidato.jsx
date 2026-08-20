import { CANDIDATOS } from './candidatos.js';

/** Filtra por deputado federal parceiro. `obter` diz de onde tirar o candidato. */
export function filtrarCandidato(itens, candidato, obter = (x) => x.candidato) {
  if (!candidato) return itens;
  return itens.filter((x) => (obter(x) || '') === candidato);
}

/** Seletor de deputado federal parceiro. valor '' = todos. */
export default function FiltroCandidato({ valor, aoMudar }) {
  return (
    <label className="filtro">
      🧑‍⚖️{' '}
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Todos os deputados</option>
        {CANDIDATOS.map((c) => (
          <option key={c.slug} value={c.nome}>{c.nome}</option>
        ))}
      </select>
    </label>
  );
}
