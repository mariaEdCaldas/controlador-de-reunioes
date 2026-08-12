import { useState } from 'react';
import { createPortal } from 'react-dom';
import { marcarRealizada } from './api.js';

/**
 * Modal de finalizar reunião: pergunta quantas pessoas foram e marca como
 * realizada (vai para o Histórico). Substitui o window.prompt, que em alguns
 * navegadores não abre.
 */
export default function FinalizarReuniao({ reuniao, aoSalvar, aoFechar }) {
  const [presentes, setPresentes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function confirmar(e) {
    e.preventDefault();
    const n = Number(presentes);
    if (!Number.isInteger(n) || n < 0) {
      setErro('Informe um número inteiro de presentes (0 ou mais).');
      return;
    }
    setSalvando(true);
    try {
      const r = await marcarRealizada(reuniao.id, n);
      aoSalvar(r.reuniao);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="editar-caixa finalizar-caixa" onClick={(e) => e.stopPropagation()}>
        <h2>Finalizar reunião</h2>
        <p className="sub" style={{ marginBottom: 14 }}>
          {reuniao.nome?.trim() || reuniao.endereco} — {reuniao.data && reuniao.hora}
        </p>
        <form onSubmit={confirmar}>
          <label className="campo">
            <span>Quantas pessoas foram à reunião?</span>
            <input
              type="number"
              min="0"
              value={presentes}
              onChange={(e) => setPresentes(e.target.value)}
              placeholder="ex.: 80"
              autoFocus
            />
          </label>
          {erro && <p className="aviso erro" style={{ marginTop: 12 }}>{erro}</p>}
          <div className="acoes-form">
            <button type="submit" className="botao primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Finalizar'}
            </button>
            <button type="button" className="botao" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
