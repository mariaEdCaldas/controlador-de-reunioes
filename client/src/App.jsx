import { useState } from 'react';
import PainelAgenda from './PainelAgenda.jsx';
import NovaReuniao from './NovaReuniao.jsx';
import Pessoas from './Pessoas.jsx';
import Lembretes from './Lembretes.jsx';
import AgendaRodrigo from './AgendaRodrigo.jsx';

const NAV = [
  { id: 'agenda', rotulo: 'Agenda' },
  { id: 'rodrigo', rotulo: 'Agenda Dr Rodrigo' },
  { id: 'pessoas', rotulo: 'Pessoas' },
  { id: 'lembretes', rotulo: 'Lembretes' },
];

export default function App() {
  const [aba, setAba] = useState('agenda');
  const [recarga, setRecarga] = useState(0);
  // Valores para pré-preencher a Nova Reunião (quando vem de uma proposta).
  const [reuniaoInicial, setReuniaoInicial] = useState(null);
  // Se a imagem do banner não estiver em client/public/paulo-correa.png,
  // cai no texto para não deixar o menu quebrado.
  const [semBanner, setSemBanner] = useState(false);

  function abrirNovaReuniao(inicial = null) {
    setReuniaoInicial(inicial);
    setAba('nova');
  }

  function voltarParaAgenda() {
    setReuniaoInicial(null);
    setRecarga((n) => n + 1);
    setAba('agenda');
  }

  return (
    <div className="layout">
      {/* Coluna lateral fixa (vira barra horizontal no topo em telas pequenas). */}
      <aside className="lateral">
        <div className="identidade">
          {semBanner ? (
            <div className="candidato">Dep. Paulo Corrêa</div>
          ) : (
            <img
              className="banner-candidato"
              src="/artes/paulo-correa-png.png"
              alt="Deputado Estadual Paulo Corrêa"
              onError={() => setSemBanner(true)}
            />
          )}
          <div className="numero">22.222</div>
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

        <div className="rodape-lateral">Agenda de Palestrantes</div>
      </aside>

      <main className="conteudo">
        {aba === 'agenda' && (
          <PainelAgenda key={recarga} aoNovaReuniao={abrirNovaReuniao} />
        )}
        {aba === 'nova' && (
          <NovaReuniao aoConcluir={voltarParaAgenda} inicial={reuniaoInicial} />
        )}
        {aba === 'rodrigo' && <AgendaRodrigo />}
        {aba === 'pessoas' && <Pessoas />}
        {aba === 'lembretes' && <Lembretes />}
      </main>
    </div>
  );
}
