import { useState } from 'react';
import { createPortal } from 'react-dom';
import { arteDoCandidato, diaDaSemana, horaCurta } from './candidatos.js';
import { formatarData, formatarTelefone } from './regioes.js';
import './impressao.css';

/**
 * Folha da reunião no padrão da agenda, para imprimir ou salvar em PDF.
 *
 * O cabeçalho usa a arte do candidato (client/public/artes/<slug>.png). Se o
 * arquivo não existir, cai num cabeçalho no mesmo estilo, só com os nomes.
 * A impressão sai só da folha (o resto da tela some via CSS @media print).
 */
export default function FolhaImpressao({ reuniao, aoFechar }) {
  const [semArte, setSemArte] = useState(false);
  const arte = arteDoCandidato(reuniao.candidato);

  const nome = (reuniao.nome || 'REUNIÃO').toUpperCase();
  const tituloLinha =
    `${horaCurta(reuniao.hora)} - ${nome}` +
    ` - PAULO CORRÊA${reuniao.candidato ? ` E ${reuniao.candidato.toUpperCase()}` : ''}`;

  const enderecoLinha =
    [reuniao.endereco, reuniao.regiao].filter(Boolean).join(' - ') +
    ', Campo Grande - MS';

  const cadeirasLinha = [
    reuniao.qtd_cadeiras ? `${reuniao.qtd_cadeiras} CADEIRAS` : null,
    reuniao.tem_som ? 'SOM' : null,
  ]
    .filter(Boolean)
    .join(' E ');

  // Portal para o body: assim a impressão isola a folha do resto da app
  // (o @media print esconde .layout e mostra só a folha).
  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="impressao-caixa" onClick={(e) => e.stopPropagation()}>
        <div className="impressao-acoes nao-imprimir">
          <button className="botao primario" onClick={() => window.print()}>
            Imprimir / Salvar PDF
          </button>
          <button className="botao" onClick={aoFechar}>Fechar</button>
        </div>

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
      </div>
    </div>,
    document.body
  );
}
