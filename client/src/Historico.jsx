import { useEffect, useState } from 'react';
import { listarReunioes } from './api.js';
import { corDaRegiao, formatarData } from './regioes.js';

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

  useEffect(() => {
    listarReunioes({ status: 'realizada' })
      .then(setReunioes)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const totalPresentes = reunioes.reduce((soma, r) => soma + (r.presentes ?? 0), 0);

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Histórico</h1>
          <p className="sub">Reuniões já realizadas — base para a prestação de contas.</p>
        </div>
      </header>

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : reunioes.length === 0 ? (
        <p className="vazio">
          Nenhuma reunião marcada como realizada ainda. Na Agenda, informe o número
          de presentes e clique em “Marcar como realizada”.
        </p>
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
              {reunioes.map((r) => (
                <tr key={r.id}>
                  <td className="data nowrap">{formatarData(r.data)}</td>
                  <td>
                    <strong>{r.local}</strong>
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
                  <td>{r.titular_nome}</td>
                  <td className="num">{r.presentes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">
                  {reunioes.length} reuni{reunioes.length === 1 ? 'ão' : 'ões'} realizada
                  {reunioes.length === 1 ? '' : 's'}
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
