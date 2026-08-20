import { useEffect, useState } from 'react';
import { listarReunioes } from './api.js';
import { corDaRegiao, formatarData } from './regioes.js';
import Busca, { contemBusca } from './Busca.jsx';
import FiltroPeriodo, { filtrarPeriodo } from './FiltroPeriodo.jsx';
import FiltroCandidato, { filtrarCandidato } from './FiltroCandidato.jsx';

/**
 * RN-10: só as reuniões já realizadas, em tabela.
 *
 * É a base da prestação de contas do período eleitoral, então a tela é
 * deliberadamente sem firulas: uma linha por reunião, os totais no rodapé, e
 * nada clicável que possa alterar o que já aconteceu.
 */
export default function Historico() {
  const [reunioes, setReunioes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState({ modo: 'todas', ini: '', fim: '' });
  const [candidato, setCandidato] = useState('');

  useEffect(() => {
    listarReunioes({ status: 'realizada' })
      .then(setReunioes)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const visiveis = filtrarCandidato(filtrarPeriodo(reunioes, periodo), candidato).filter((r) =>
    contemBusca(`${r.nome ?? ''} ${r.local ?? ''} ${r.endereco ?? ''} ${r.regiao ?? ''} ${r.titular_nome ?? ''}`, busca)
  );
  const totalPresentes = visiveis.reduce((soma, r) => soma + (r.presentes ?? 0), 0);

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Histórico</h1>
          <p className="sub">Reuniões já realizadas — base para a prestação de contas.</p>
        </div>
      </header>

      {reunioes.length > 0 && (
        <div className="barra-filtros">
          <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar no histórico…" />
          <FiltroPeriodo periodo={periodo} aoMudar={setPeriodo} />
          <FiltroCandidato valor={candidato} aoMudar={setCandidato} />
        </div>
      )}

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : reunioes.length === 0 ? (
        <p className="vazio">
          Nenhuma reunião marcada como realizada ainda. Na Agenda, use o botão
          “Finalizar” para registrar quantas pessoas foram.
        </p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">Nenhuma reunião encontrada para essa busca.</p>
      ) : (
        <div className="cartao tabela-caixa">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Local</th>
                <th>Bairro</th>
                <th>Palestrante</th>
                <th className="num">Presentes</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={r.id}>
                  <td className="data nowrap">{formatarData(r.data)}</td>
                  <td>
                    <strong>{r.nome?.trim() || r.local || r.endereco}</strong>
                    <div className="celula-sub">{r.endereco}</div>
                  </td>
                  <td className="nowrap">
                    <span className="item-bairro">
                      <span
                        className="bolinha"
                        style={{ background: corDaRegiao(r.regiao) }}
                        aria-hidden="true"
                      />
                      {r.regiao}
                    </span>
                  </td>
                  <td>{r.titular_nome ?? <em style={{ color: '#9ca3af' }}>—</em>}</td>
                  <td className="num">{r.presentes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">
                  {visiveis.length} reuni{visiveis.length === 1 ? 'ão' : 'ões'} realizada
                  {visiveis.length === 1 ? '' : 's'}
                </td>
                <td className="rotulo-total">Total de presentes</td>
                <td className="num">{totalPresentes}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
