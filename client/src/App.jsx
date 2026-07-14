import Palestrantes from './Palestrantes.jsx';

export default function App() {
  return (
    <div className="pagina">
      <header className="topo">
        <div className="marca">
          <span className="patinhos" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <div>
            <strong>Agenda de Palestrantes</strong>
            <small>Gabinete Dep. Paulo Corrêa</small>
          </div>
        </div>
        {/* As abas de Reuniões e Agenda entram nos próximos módulos. */}
        <nav className="abas">
          <span className="aba ativa">Palestrantes</span>
        </nav>
      </header>

      <main>
        <Palestrantes />
      </main>
    </div>
  );
}
