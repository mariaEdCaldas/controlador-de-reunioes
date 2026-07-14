import { useEffect, useState } from 'react';

export default function App() {
  const [conexao, setConexao] = useState({ estado: 'carregando' });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((dados) => setConexao({ estado: 'ok', dados }))
      .catch((erro) => setConexao({ estado: 'erro', mensagem: erro.message }));
  }, []);

  return (
    <main>
      <h1>Agenda de Palestrantes</h1>
      <p className="sub">Gabinete Dep. Paulo Corrêa — estrutura base</p>

      {conexao.estado === 'carregando' && <p>Conectando à API…</p>}

      {conexao.estado === 'ok' && (
        <div className="status ok">
          <strong>Front e back conversando.</strong>
          <br />
          Banco SQLite: {conexao.dados.banco}
        </div>
      )}

      {conexao.estado === 'erro' && (
        <div className="status erro">
          <strong>Sem resposta da API.</strong>
          <br />
          {conexao.mensagem} — confira se o servidor está rodando na porta 3001.
        </div>
      )}
    </main>
  );
}
