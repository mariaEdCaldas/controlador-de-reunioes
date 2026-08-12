import { useState } from 'react';
import Agenda from './Agenda.jsx';
import Historico from './Historico.jsx';

const SECOES = [
  { id: 'agenda', rotulo: 'Agenda' },
  { id: 'regioes', rotulo: 'Por região' },
  { id: 'historico', rotulo: 'Histórico' },
];

/**
 * A tela "Agenda" com duas seções: as reuniões (Agenda) e o Histórico —
 * mesma ideia das seções dentro de "Pessoas".
 */
export default function PainelAgenda({ aoNovaReuniao }) {
  const [secao, setSecao] = useState('agenda');

  return (
    <>
      <div className="secoes-abas">
        {SECOES.map((s) => (
          <button
            key={s.id}
            className={`secao-aba ${secao === s.id ? 'ativa' : ''}`}
            onClick={() => setSecao(s.id)}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {secao === 'agenda' && <Agenda aoNovaReuniao={aoNovaReuniao} />}
      {secao === 'regioes' && <Agenda porRegiao aoNovaReuniao={aoNovaReuniao} />}
      {secao === 'historico' && <Historico />}
    </>
  );
}
