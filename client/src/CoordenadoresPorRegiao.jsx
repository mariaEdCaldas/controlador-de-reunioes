import { useEffect, useState } from 'react';
import { listarCoordenadores } from './api.js';
import { formatarTelefone } from './regioes.js';
import { agruparPorRegiao } from './regioesCampoGrande.js';
import Busca, { contemBusca } from './Busca.jsx';
import './times.css';

/** Link do WhatsApp com uma saudação genérica (sem contexto de reunião). */
function linkWhatsApp(c) {
  const texto = `Olá ${c.nome}! Aqui é do gabinete do Dep. Paulo Corrêa.`;
  return `https://wa.me/${c.telefone}?text=${encodeURIComponent(texto)}`;
}

/**
 * Coordenadores organizados por REGIÃO — cada bloco é uma das 7 regiões urbanas
 * de Campo Grande, descoberta a partir do bairro cadastrado no coordenador
 * (mesma lógica da agenda por região). Visão de consulta: contato rápido e o
 * time de cada um; o cadastro/edição continua na aba "Coordenadores".
 */
export default function CoordenadoresPorRegiao() {
  const [coordenadores, setCoordenadores] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    listarCoordenadores()
      .then(setCoordenadores)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const visiveis = coordenadores.filter((c) =>
    contemBusca(`${c.nome} ${c.bairro ?? ''} ${c.rede_social ?? ''} ${c.time_nome ?? ''}`, busca)
  );
  const grupos = agruparPorRegiao(visiveis, (c) => c.bairro);

  return (
    <div>
      <header className="cabecalho-secao">
        <div>
          <h1>Coordenadores por região</h1>
          <p className="sub">agrupados pela região do bairro de cada um</p>
        </div>
      </header>

      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome, bairro, rede ou time…" />

      {erro && <p className="aviso erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">
          {busca ? 'Nenhum coordenador encontrado.' : 'Nenhum coordenador cadastrado.'}
        </p>
      ) : (
        grupos.map((g) => (
          <div className="grupo-regiao" key={g.regiao}>
            <h2 className="regiao-titulo">
              <span className="regiao-nome">{g.rotulo}</span>
              <span className="regiao-contagem">
                {g.itens.length} coordenador{g.itens.length === 1 ? '' : 'es'}
              </span>
            </h2>
            <ul className="lista lista-cartoes">
              {g.itens.map((c) => (
                <li key={c.id} className="cartao coord-regiao-card">
                  <div className="item-principal">
                    <div className="item-nome">
                      {c.nome}
                      {c.time_nome && <span className="time-tag">{c.time_nome}</span>}
                    </div>
                    <div className="item-telefone">
                      {c.telefone ? formatarTelefone(c.telefone) : <em>sem telefone</em>}
                    </div>
                    <div className="coord-extra">
                      {c.bairro && <span>{c.bairro}</span>}
                      {c.rede_social && <span className="coord-rede">{c.rede_social}</span>}
                    </div>
                  </div>

                  {c.telefone && (
                    <div className="item-acoes">
                      <a className="botao pequeno" href={`tel:+${c.telefone}`}>Ligar</a>
                      <a
                        className="botao pequeno secundario"
                        href={linkWhatsApp(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
