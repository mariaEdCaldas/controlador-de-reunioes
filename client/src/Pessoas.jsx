import { usarPersistido } from './usarPersistido.js';
import VisaoGeral from './VisaoGeral.jsx';
import Coordenadores from './Coordenadores.jsx';
import CoordenadoresPorRegiao from './CoordenadoresPorRegiao.jsx';
import Cabos from './Cabos.jsx';
import Times from './Times.jsx';
import Palestrantes from './Palestrantes.jsx';

const SECOES = [
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'coordenadores', rotulo: 'Coordenadores' },
  { id: 'coord-regiao', rotulo: 'Por região' },
  { id: 'cabos', rotulo: 'Cabos' },
  { id: 'times', rotulo: 'Times' },
  { id: 'palestrantes', rotulo: 'Palestrantes' },
];

/**
 * "Pessoas": junta Coordenadores, Times e Palestrantes num só menu, cada um
 * numa seção (aba interna) com o seu próprio cadastro.
 */
export default function Pessoas() {
  const [secao, setSecao] = usarPersistido('pessoas-secao', 'visao');

  return (
    <section>
      <div className="secoes-abas">
        {SECOES.map((s) => (
          <button
            key={s.id}
            className={`secao-aba ${secao === s.id ? 'ativa' : ''}`}
            onClick={() => setSecao(s.id)}
            aria-current={secao === s.id ? 'page' : undefined}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {secao === 'visao' && <VisaoGeral />}
      {secao === 'coordenadores' && <Coordenadores />}
      {secao === 'coord-regiao' && <CoordenadoresPorRegiao />}
      {secao === 'cabos' && <Cabos />}
      {secao === 'times' && <Times />}
      {secao === 'palestrantes' && <Palestrantes />}
    </section>
  );
}
