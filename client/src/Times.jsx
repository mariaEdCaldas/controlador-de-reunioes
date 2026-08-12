import { useEffect, useState } from 'react';
import {
  listarTimes,
  listarCoordenadores,
  criarTime,
  renomearTime,
  excluirTime,
  vincularCoordenador,
} from './api.js';
import { formatarTelefone } from './regioes.js';
import Busca, { contemBusca } from './Busca.jsx';
import './times.css';

/**
 * Times: cadastro (só o nome) e vínculo dos coordenadores.
 *
 * O vínculo mora aqui: cada time expande para mostrar seus coordenadores, com
 * um seletor para trazer mais gente (os sem time aparecem primeiro).
 */
export default function Times() {
  const [times, setTimes] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    return Promise.all([listarTimes(), listarCoordenadores()])
      .then(([t, c]) => {
        setTimes(t);
        setCoordenadores(c);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e) {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return;
    try {
      await criarTime(nome);
      setNovoNome('');
      setMostrarForm(false);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function renomear(time) {
    const nome = window.prompt('Novo nome do time:', time.nome);
    if (nome === null || nome.trim() === time.nome) return;
    try {
      await renomearTime(time.id, nome.trim());
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(time) {
    const msg =
      time.coordenadores > 0
        ? `Excluir o time "${time.nome}"? Os ${time.coordenadores} coordenadores não são apagados — ficam sem time.`
        : `Excluir o time "${time.nome}"?`;
    if (!window.confirm(msg)) return;
    try {
      await excluirTime(time.id);
      if (aberto === time.id) setAberto(null);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function vincular(coordId, timeId) {
    try {
      await vincularCoordenador(coordId, timeId);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  const visiveis = times.filter((t) => contemBusca(t.nome, busca));

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Times</h1>
          <p className="sub">
            {times.length} time{times.length === 1 ? '' : 's'} — clique em um para
            ver e vincular coordenadores
          </p>
        </div>
        {!mostrarForm && (
          <button className="botao primario" onClick={() => setMostrarForm(true)}>
            + Novo time
          </button>
        )}
      </header>

      {mostrarForm && (
        <form className="cartao form time-novo" onSubmit={adicionar}>
          <label className="campo">
            <span>Novo time</span>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do time"
              autoFocus
            />
          </label>
          <button type="submit" className="botao primario">Cadastrar</button>
          <button type="button" className="botao" onClick={() => { setMostrarForm(false); setNovoNome(''); }}>
            Cancelar
          </button>
        </form>
      )}

      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar time…" />

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">
          {busca ? 'Nenhum time encontrado.' : 'Nenhum time cadastrado ainda.'}
        </p>
      ) : (
        <ul className="lista">
          {visiveis.map((t) => {
            const doTime = coordenadores.filter((c) => c.time_id === t.id);
            const disponiveis = coordenadores.filter((c) => c.time_id !== t.id);
            const expandido = aberto === t.id;
            return (
              <li key={t.id} className="cartao time">
                <div className="time-cabeca">
                  <div className="time-info">
                    <span className="time-nome">{t.nome}</span>
                    <span className="time-contagem">
                      {t.coordenadores} coordenador{t.coordenadores === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <div className="time-acoes">
                    <button
                      className="botao pequeno"
                      onClick={() => setAberto(expandido ? null : t.id)}
                    >
                      {expandido ? 'Fechar' : 'Gerenciar'}
                    </button>
                    <button className="botao pequeno" onClick={() => renomear(t)}>
                      Renomear
                    </button>
                    <button className="botao pequeno" onClick={() => excluir(t)}>
                      Excluir
                    </button>
                  </div>
                </div>

                {expandido && (
                  <div className="time-painel">
                    <VincularCoordenador
                      disponiveis={disponiveis}
                      aoVincular={(coordId) => vincular(coordId, t.id)}
                    />

                    {doTime.length === 0 ? (
                      <p className="vazio pequeno">
                        Nenhum coordenador neste time ainda. Use o seletor acima.
                      </p>
                    ) : (
                      <ul className="lista-coord">
                        {doTime.map((c) => (
                          <li key={c.id} className="coord-linha">
                            <div>
                              <div className="coord-nome">{c.nome}</div>
                              <div className="item-telefone">
                                {c.telefone ? formatarTelefone(c.telefone) : 'sem telefone'}
                              </div>
                            </div>
                            <button
                              className="botao pequeno"
                              onClick={() => vincular(c.id, null)}
                            >
                              Desvincular
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Seletor que traz um coordenador para o time. Os sem time vêm primeiro. */
function VincularCoordenador({ disponiveis, aoVincular }) {
  const [escolhido, setEscolhido] = useState('');

  const semTime = disponiveis.filter((c) => !c.time_id);
  const comOutroTime = disponiveis.filter((c) => c.time_id);

  function confirmar() {
    if (!escolhido) return;
    aoVincular(Number(escolhido));
    setEscolhido('');
  }

  return (
    <div className="vincular">
      <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
        <option value="">Vincular coordenador…</option>
        {semTime.length > 0 && (
          <optgroup label="Sem time">
            {semTime.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </optgroup>
        )}
        {comOutroTime.length > 0 && (
          <optgroup label="Em outro time (vai mudar de time)">
            {comOutroTime.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.time_nome}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <button className="botao pequeno primario" onClick={confirmar} disabled={!escolhido}>
        Vincular
      </button>
    </div>
  );
}
