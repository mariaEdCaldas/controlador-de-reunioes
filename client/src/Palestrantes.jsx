import { useEffect, useState } from 'react';
import {
  listarPalestrantes,
  listarRegioes,
  mudarStatusPalestrante,
} from './api.js';
import { corDaRegiao, formatarTelefone } from './regioes.js';
import PalestranteForm from './PalestranteForm.jsx';

export default function Palestrantes() {
  const [palestrantes, setPalestrantes] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [filtroRegiao, setFiltroRegiao] = useState('');
  // null = nenhum formulário aberto | 'novo' | objeto do palestrante em edição
  const [formulario, setFormulario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarRegioes().then(setRegioes).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    setCarregando(true);
    listarPalestrantes({ regiaoId: filtroRegiao })
      .then((lista) => {
        setPalestrantes(lista);
        setErro('');
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [filtroRegiao]);

  function aoSalvar(salvo) {
    setFormulario(null);
    // Recarrega da API em vez de remendar a lista na mão: assim o filtro por
    // bairro continua valendo (se a pessoa mudou o bairro, o item pode até
    // sair da lista visível).
    listarPalestrantes({ regiaoId: filtroRegiao })
      .then(setPalestrantes)
      .catch((e) => setErro(e.message));
  }

  async function alternarStatus(p) {
    try {
      const atualizado = await mudarStatusPalestrante(p.id, !p.ativo);
      setPalestrantes((lista) =>
        lista.map((x) => (x.id === atualizado.id ? atualizado : x))
      );
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Palestrantes</h1>
          <p className="sub">
            {palestrantes.length} cadastrado{palestrantes.length === 1 ? '' : 's'}
            {filtroRegiao ? ' neste bairro' : ''}
          </p>
        </div>
        {!formulario && (
          <button className="botao primario" onClick={() => setFormulario('novo')}>
            + Novo palestrante
          </button>
        )}
      </header>

      {formulario && (
        <PalestranteForm
          // key força um formulário novo (campos limpos) ao trocar de alvo,
          // em vez de reaproveitar o estado do palestrante anterior.
          key={formulario === 'novo' ? 'novo' : formulario.id}
          palestrante={formulario === 'novo' ? null : formulario}
          regioes={regioes}
          aoSalvar={aoSalvar}
          aoCancelar={() => setFormulario(null)}
        />
      )}

      <div className="filtro">
        <label>
          Bairro:{' '}
          <select value={filtroRegiao} onChange={(e) => setFiltroRegiao(e.target.value)}>
            <option value="">Todos</option>
            {regioes.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : palestrantes.length === 0 ? (
        <p className="vazio">
          {filtroRegiao
            ? 'Nenhum palestrante cadastrado neste bairro.'
            : 'Nenhum palestrante cadastrado ainda.'}
        </p>
      ) : (
        <ul className="lista">
          {palestrantes.map((p) => (
            <li key={p.id} className={`cartao item ${p.ativo ? '' : 'inativo'}`}>
              <div className="item-principal">
                <div className="item-nome">
                  {p.nome}
                  {!p.ativo && <span className="etiqueta">inativo</span>}
                </div>
                <div className="item-temas">
                  {p.temas ? p.temas : <em>sem temas cadastrados</em>}
                </div>
              </div>

              <div className="item-bairro">
                <span
                  className="bolinha"
                  style={{ background: corDaRegiao(p.regiao) }}
                  aria-hidden="true"
                />
                {p.regiao}
              </div>

              <div className="item-telefone">{formatarTelefone(p.telefone)}</div>

              <div className="item-acoes">
                <button className="botao pequeno" onClick={() => setFormulario(p)}>
                  Editar
                </button>
                <button className="botao pequeno" onClick={() => alternarStatus(p)}>
                  {p.ativo ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="rodape-nota">
        Palestrante inativo não é excluído: ele sai das sugestões de novas
        reuniões, mas continua no histórico das que já aconteceram.
      </p>
    </section>
  );
}
