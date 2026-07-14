import { useEffect, useState } from 'react';
import { listarReunioes } from './api.js';
import { corDaRegiao, formatarData, ROTULO_STATUS } from './regioes.js';
import Sugestoes from './Sugestoes.jsx';

export default function Agenda({ aoNovaReuniao }) {
  const [reunioes, setReunioes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  // Reunião cujo painel de sugestões está aberto (alocar/trocar palestrante).
  const [alocando, setAlocando] = useState(null);

  const carregar = () =>
    listarReunioes()
      .then((lista) => {
        setReunioes(lista);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));

  useEffect(() => {
    carregar();
  }, []);

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Agenda</h1>
          <p className="sub">
            {reunioes.length} reuni{reunioes.length === 1 ? 'ão' : 'ões'} — mais recentes primeiro
          </p>
        </div>
        <button className="botao primario" onClick={aoNovaReuniao}>
          + Nova reunião
        </button>
      </header>

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : reunioes.length === 0 ? (
        <p className="vazio">Nenhuma reunião cadastrada ainda.</p>
      ) : (
        <ul className="lista">
          {reunioes.map((r) => (
            <li key={r.id} className="cartao reuniao">
              <div className="reuniao-quando">
                <strong>{formatarData(r.data)}</strong>
                <span>{r.hora}</span>
              </div>

              <div className="reuniao-onde">
                <div className="item-nome">{r.local}</div>
                <div className="item-temas">{r.endereco}</div>
                <div className="item-bairro">
                  <span
                    className="bolinha"
                    style={{ background: corDaRegiao(r.regiao) }}
                    aria-hidden="true"
                  />
                  {r.regiao}
                </div>
              </div>

              <div className="reuniao-quem">
                <div>
                  <span className="rotulo">Titular</span>{' '}
                  {r.titular_nome ?? <em className="pendente">a definir</em>}
                </div>
                <div>
                  <span className="rotulo">Reserva</span>{' '}
                  {r.reserva_nome ?? <em className="pendente">nenhuma</em>}
                </div>
              </div>

              <div className="reuniao-status">
                <span className={`status ${r.status}`}>{ROTULO_STATUS[r.status]}</span>
                <button
                  className="botao pequeno"
                  onClick={() => setAlocando(alocando === r.id ? null : r.id)}
                >
                  {alocando === r.id
                    ? 'Fechar'
                    : r.titular_nome
                      ? 'Trocar palestrante'
                      : 'Alocar palestrante'}
                </button>
              </div>

              {alocando === r.id && (
                <div className="reuniao-painel">
                  <Sugestoes reuniaoId={r.id} aoAtualizar={carregar} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
