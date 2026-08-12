/**
 * Barra de pesquisa reutilizável. Filtra a lista da tela no cliente — o pai
 * decide sobre quais campos comparar.
 */
export default function Busca({ valor, aoMudar, placeholder = 'Pesquisar…' }) {
  return (
    <div className="busca">
      <span className="busca-icone" aria-hidden="true">🔎</span>
      <input
        type="search"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
      />
      {valor && (
        <button
          type="button"
          className="busca-limpar"
          onClick={() => aoMudar('')}
          aria-label="Limpar busca"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Normaliza (sem acento, minúsculo) para comparar busca com o texto. */
export function contemBusca(texto, termo) {
  const norm = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  return norm(texto).includes(norm(termo).trim());
}
