import { useEffect, useState } from 'react';
import { listarCabos, listarCoordenadores, listarTimes } from './api.js';
import { contagemPorRegiao } from './regioesCampoGrande.js';

/** Barra de contagem (mapa de calor azul), reaproveitando o estilo do painel BI. */
function Barras({ titulo, linhas, vazio = 'Sem dados ainda.' }) {
  const maximo = linhas.reduce((m, l) => Math.max(m, l.n), 0);
  return (
    <div className="cartao painel-bi">
      <div className="bi-cabeca"><h2>{titulo}</h2></div>
      {linhas.length === 0 ? (
        <p className="vazio pequeno">{vazio}</p>
      ) : (
        <ul className="bi-barras">
          {linhas.map((l, i) => {
            const pct = maximo ? Math.round((l.n / maximo) * 100) : 0;
            const cor = l.n === 0 ? '#d7dccf' : `hsl(212 82% ${58 - (l.n / maximo) * 30}%)`;
            return (
              <li key={l.rotulo} className={`bi-linha ${l.n === 0 ? 'zerada' : ''} ${i === 0 && l.n > 0 ? 'lider' : ''}`}>
                <span className="bi-rotulo">{l.rotulo}</span>
                <span className="bi-trilha"><span className="bi-preenche" style={{ width: `${pct}%`, background: cor }} /></span>
                <span className="bi-valor">{l.n}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Visão geral de Pessoas: totais e gráficos (cabos por time, coordenador e região). */
export default function VisaoGeral() {
  const [cabos, setCabos] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([listarCabos(), listarCoordenadores(), listarTimes()])
      .then(([k, c, t]) => { setCabos(k); setCoordenadores(c); setTimes(t); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p className="vazio">Carregando…</p>;
  if (erro) return <p className="aviso erro">{erro}</p>;

  const totalPessoas = coordenadores.length + cabos.length;

  // Cabos por time (via coordenador). Sem time / sem coordenador vão para "—".
  const porTime = new Map(times.map((t) => [t.nome, 0]));
  let semTime = 0;
  for (const k of cabos) {
    if (k.time_nome && porTime.has(k.time_nome)) porTime.set(k.time_nome, porTime.get(k.time_nome) + 1);
    else semTime += 1;
  }
  const linhasTime = [...porTime.entries()].map(([rotulo, n]) => ({ rotulo, n }));
  if (semTime) linhasTime.push({ rotulo: 'Sem time', n: semTime });
  linhasTime.sort((a, b) => b.n - a.n);

  // Top coordenadores por nº de cabos.
  const porCoord = new Map();
  for (const k of cabos) {
    const nome = k.coordenador_nome ?? 'Sem coordenador';
    porCoord.set(nome, (porCoord.get(nome) ?? 0) + 1);
  }
  const linhasCoord = [...porCoord.entries()]
    .map(([rotulo, n]) => ({ rotulo, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  // Cabos por região (a partir do bairro de cada cabo).
  const { linhas: linhasRegiao } = contagemPorRegiao(cabos, (k) => k.bairro);

  return (
    <div>
      <header className="cabecalho-secao">
        <div>
          <h1>Visão geral</h1>
          <p className="sub">números e distribuição das pessoas do gabinete</p>
        </div>
      </header>

      <div className="cartoes-numero">
        <NumeroCard rotulo="Times" valor={times.length} />
        <NumeroCard rotulo="Coordenadores" valor={coordenadores.length} />
        <NumeroCard rotulo="Cabos" valor={cabos.length} />
        <NumeroCard rotulo="Total de pessoas" valor={totalPessoas} destaque />
      </div>

      <Barras titulo="Cabos por time" linhas={linhasTime} vazio="Cadastre cabos e vincule os coordenadores a times." />
      <Barras titulo="Cabos por coordenador (top 8)" linhas={linhasCoord} vazio="Nenhum cabo cadastrado ainda." />
      <Barras titulo="Cabos por região" linhas={linhasRegiao.map((l) => ({ rotulo: l.rotulo, n: l.n }))} vazio="Informe o bairro dos cabos para ver a distribuição." />
    </div>
  );
}

function NumeroCard({ rotulo, valor, destaque }) {
  return (
    <div className={`cartao numero-card ${destaque ? 'destaque' : ''}`}>
      <div className="numero-valor">{valor}</div>
      <div className="numero-rotulo">{rotulo}</div>
    </div>
  );
}
