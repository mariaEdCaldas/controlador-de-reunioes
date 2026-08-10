import { useState } from 'react';
import Palestrantes from './Palestrantes.jsx';
import Agenda from './Agenda.jsx';
import NovaReuniao from './NovaReuniao.jsx';
import Historico from './Historico.jsx';
import Times from './Times.jsx';
import Coordenadores from './Coordenadores.jsx';

const NAV = [
  { id: 'agenda', rotulo: 'Agenda' },
  { id: 'nova', rotulo: 'Nova reunião' },
  { id: 'palestrantes', rotulo: 'Palestrantes' },
  { id: 'historico', rotulo: 'Histórico' },
  { id: 'times', rotulo: 'Times' },
  { id: 'coordenadores', rotulo: 'Coordenadores' },
];

export default function App() {
  const [aba, setAba] = useState('agenda');
  const [recarga, setRecarga] = useState(0);

  function voltarParaAgenda() {
    setRecarga((n) => n + 1);
    setAba('agenda');
  }

  return (
    <div className="layout">
      {/* Coluna lateral fixa (vira barra horizontal no topo em telas pequenas). */}
      <aside className="lateral">
        <div className="identidade">
          <div className="numero">22.222</div>
          <div className="candidato">Dep. Paulo Corrêa</div>
          <div className="lema">“5 patinhos na lagoa”</div>
          <div className="patinhos" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${aba === n.id ? 'ativa' : ''}`}
              onClick={() => setAba(n.id)}
              aria-current={aba === n.id ? 'page' : undefined}
            >
              {n.rotulo}
            </button>
          ))}
        </nav>

        {/* Atalho sempre visível: cadastrar reunião é a ação mais frequente. */}
        <button className="atalho" onClick={() => setAba('nova')}>
          + Nova reunião
        </button>

        <div className="rodape-lateral">Agenda de Palestrantes</div>
      </aside>

      <main className="conteudo">
        {aba === 'agenda' && (
          <Agenda key={recarga} aoNovaReuniao={() => setAba('nova')} />
        )}
        {aba === 'nova' && <NovaReuniao aoConcluir={voltarParaAgenda} />}
        {aba === 'palestrantes' && <Palestrantes />}
        {aba === 'historico' && <Historico />}
        {aba === 'times' && <Times />}
        {aba === 'coordenadores' && <Coordenadores />}
      </main>
    </div>
  );
}
