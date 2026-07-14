import { useEffect, useState } from 'react';
import { buscarSugestoes, definirTitular, definirReserva } from './api.js';
import { corDaRegiao, formatarTelefone, formatarData } from './regioes.js';

/**
 * Lista de palestrantes sugeridos para uma reunião (RN-03).
 *
 * O backend já devolve na ordem certa: mesmo bairro primeiro. Aqui a tela só
 * destaca visualmente essa diferença e sinaliza quem está ocupado no horário.
 *
 * Serve tanto logo após criar a reunião quanto para alocar depois, pela Agenda.
 */
export default function Sugestoes({ reuniaoId, aoAtualizar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupadoAgora, setOcupadoAgora] = useState(null); // id em processamento

  useEffect(() => {
    buscarSugestoes(reuniaoId)
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, [reuniaoId]);

  async function agir(acao, palestranteId) {
    setErro('');
    setAviso('');
    setOcupadoAgora(palestranteId);
    try {
      const r =
        acao === 'titular'
          ? await definirTitular(reuniaoId, palestranteId)
          : await definirReserva(reuniaoId, palestranteId);

      if (r.aviso) setAviso(r.aviso);

      // Recarrega as sugestões: quem virou titular aqui pode ter ficado
      // "ocupado" para outras reuniões no mesmo horário.
      const atualizado = await buscarSugestoes(reuniaoId);
      setDados(atualizado);
      aoAtualizar?.(r.reuniao);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupadoAgora(null);
    }
  }

  if (erro && !dados) return <p className="aviso erro">{erro}</p>;
  if (!dados) return <p className="vazio">Carregando sugestões…</p>;

  const { reuniao, sugestoes } = dados;
  const doBairro = sugestoes.filter((s) => s.mesma_regiao);
  const outros = sugestoes.filter((s) => !s.mesma_regiao);

  const Cartao = (s) => (
    <li key={s.id} className={`cartao sugestao ${s.ocupado ? 'ocupado' : ''}`}>
      <div className="sug-info">
        <div className="item-nome">
          {s.nome}
          {reuniao.titular_id === s.id && <span className="etiqueta titular">titular</span>}
          {reuniao.reserva_id === s.id && <span className="etiqueta reserva">reserva</span>}
        </div>
        <div className="item-temas">{s.temas || <em>sem temas cadastrados</em>}</div>
        <div className="sug-meta">
          <span className="item-bairro">
            <span
              className="bolinha"
              style={{ background: corDaRegiao(s.regiao) }}
              aria-hidden="true"
            />
            {s.regiao}
          </span>
          <span className="item-telefone">{formatarTelefone(s.telefone)}</span>
        </div>
        {/* Boolean() é obrigatório: `ocupado` chega do SQLite como 0 ou 1, e
            `0 && <p>` faria o React imprimir um "0" solto na tela. */}
        {Boolean(s.ocupado) && (
          <p className="sug-conflito">
            Já é titular de outra reunião neste mesmo dia e horário.
          </p>
        )}
      </div>

      <div className="sug-acoes">
        {/* tel: abre o discador do aparelho. */}
        <a className="botao pequeno" href={`tel:+${s.telefone}`}>
          Ligar
        </a>
        <button
          className="botao pequeno primario"
          disabled={s.ocupado || reuniao.titular_id === s.id || ocupadoAgora === s.id}
          onClick={() => agir('titular', s.id)}
        >
          {reuniao.titular_id === s.id ? 'É o titular' : 'Confirmar titular'}
        </button>
        <button
          className="botao pequeno"
          disabled={reuniao.titular_id === s.id || reuniao.reserva_id === s.id || ocupadoAgora === s.id}
          onClick={() => agir('reserva', s.id)}
        >
          {reuniao.reserva_id === s.id ? 'É a reserva' : 'Definir reserva'}
        </button>
      </div>
    </li>
  );

  return (
    <div className="painel-sugestoes">
      <h2>Palestrantes sugeridos</h2>
      <p className="sub">
        Para <strong>{reuniao.local}</strong> — {formatarData(reuniao.data)} às{' '}
        {reuniao.hora}, em {reuniao.regiao}.
      </p>

      <div className="resumo-alocacao">
        <span>
          Titular:{' '}
          <strong>{reuniao.titular_nome ?? 'ninguém ainda'}</strong>
        </span>
        <span>
          Reserva: <strong>{reuniao.reserva_nome ?? 'ninguém'}</strong>
        </span>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}
      {aviso && <p className="aviso info">{aviso}</p>}

      <h3 className="grupo">
        Do mesmo bairro ({reuniao.regiao})
        <small>é a proximidade que interessa (RN-03)</small>
      </h3>
      {doBairro.length === 0 ? (
        <p className="vazio pequeno">
          Nenhum palestrante ativo cadastrado neste bairro. Veja os demais abaixo.
        </p>
      ) : (
        <ul className="lista">{doBairro.map(Cartao)}</ul>
      )}

      <h3 className="grupo">
        Outros bairros
        <small>caso ninguém do bairro possa</small>
      </h3>
      {outros.length === 0 ? (
        <p className="vazio pequeno">Nenhum outro palestrante ativo.</p>
      ) : (
        <ul className="lista">{outros.map(Cartao)}</ul>
      )}
    </div>
  );
}
