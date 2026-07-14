import { useState } from 'react';
import Palestrantes from './Palestrantes.jsx';
import Agenda from './Agenda.jsx';
import NovaReuniao from './NovaReuniao.jsx';

const ABAS = [
  { id: 'agenda', rotulo: 'Agenda' },
  { id: 'nova', rotulo: 'Nova reunião' },
  { id: 'palestrantes', rotulo: 'Palestrantes' },
];

export default function App() {
  const [aba, setAba] = useState('agenda');
  // Muda a key da Agenda para forçá-la a recarregar ao voltar de uma criação.
  const [recarga, setRecarga] = useState(0);

  function voltarParaAgenda() {
    setRecarga((n) => n + 1);
    setAba('agenda');
  }

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

        <nav className="abas">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={`aba ${aba === a.id ? 'ativa' : ''}`}
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {aba === 'agenda' && (
          <Agenda key={recarga} aoNovaReuniao={() => setAba('nova')} />
        )}
        {aba === 'nova' && <NovaReuniao aoConcluir={voltarParaAgenda} />}
        {aba === 'palestrantes' && <Palestrantes />}
      </main>
    </div>
  );
}
