import { createPortal } from 'react-dom';
import FolhaConteudo from './FolhaConteudo.jsx';
import './impressao.css';

/**
 * Folha da reunião no padrão da agenda, para imprimir ou salvar em PDF.
 * O conteúdo em si fica em FolhaConteudo (compartilhado com o envio por imagem).
 * A impressão sai só da folha (o resto da tela some via CSS @media print).
 */
export default function FolhaImpressao({ reuniao, aoFechar }) {
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

        <FolhaConteudo reuniao={reuniao} />
      </div>
    </div>,
    document.body
  );
}
