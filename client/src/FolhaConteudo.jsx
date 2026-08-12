import { useState } from 'react';
import { arteDoCandidato, diaDaSemana, horaCurta } from './candidatos.js';
import { formatarData, formatarTelefone } from './regioes.js';
import './impressao.css';

/**
 * A folha da reunião em si (sem o modal/botões) — o que sai na impressão e o que
 * vira imagem no compartilhamento por WhatsApp. Reaproveitada por FolhaImpressao
 * (modal) e por compartilharFolha (captura em imagem).
 */
export default function FolhaConteudo({ reuniao }) {
  const [semArte, setSemArte] = useState(false);
  const arte = arteDoCandidato(reuniao.candidato);

  const nome = (reuniao.nome || 'REUNIÃO').toUpperCase();
  const tituloLinha =
    `${horaCurta(reuniao.hora)} - ${nome}` +
    ` - PAULO CORRÊA${reuniao.candidato ? ` E ${reuniao.candidato.toUpperCase()}` : ''}`;

  // Só o endereço (ele já traz bairro e cidade); não repetir a região aqui.
  const enderecoLinha = reuniao.endereco;

  const cadeirasLinha = [
    reuniao.qtd_cadeiras ? `${reuniao.qtd_cadeiras} CADEIRAS` : null,
    reuniao.tem_som ? 'SOM' : null,
  ]
    .filter(Boolean)
    .join(' E ');

  return (
    <div className="folha">
      {arte && !semArte ? (
        <img className="folha-arte" src={arte} alt="" onError={() => setSemArte(true)} />
      ) : (
        <div className="folha-cabecalho">
          <div className="fc-agenda">
            <b>AGENDA</b>
            <span>CAPITAL</span>
          </div>
          <div className="fc-paulo">
            <small>DEPUTADO ESTADUAL</small>
            <b>PAULO CORRÊA</b>
          </div>
          <div className="fc-dupla">
            <span>PAULO CORRÊA</span>
            {reuniao.candidato && <span>{reuniao.candidato.toUpperCase()}</span>}
          </div>
        </div>
      )}

      <div className="folha-corpo">
        <div className="fb-data">
          {formatarData(reuniao.data)} - ({diaDaSemana(reuniao.data)})
        </div>
        <div className="fb-titulo">{tituloLinha}</div>
        <div className="fb-linha">
          <b>Local Rua:</b> {enderecoLinha}
        </div>
        {reuniao.coordenador_nome && (
          <div className="fb-linha">
            <b>Contato:</b> {formatarTelefone(reuniao.coordenador_telefone)}{' '}
            {reuniao.coordenador_nome}
          </div>
        )}
        {cadeirasLinha && <div className="fb-cadeiras">{cadeirasLinha}</div>}
      </div>
    </div>
  );
}
