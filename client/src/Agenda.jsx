import { useEffect, useState } from 'react';
import { listarReunioes, salvarChecklist, marcarRealizada } from './api.js';
import { corDaRegiao, formatarData, ROTULO_STATUS } from './regioes.js';
import Sugestoes from './Sugestoes.jsx';

export default function Agenda({ aoNovaReuniao }) {
  const [reunioes, setReunioes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
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

  const substituir = (atualizada) =>
    setReunioes((lista) => lista.map((r) => (r.id === atualizada.id ? atualizada : r)));

  /**
   * RN-05: clicar na caixinha já grava. Os dois itens vão juntos no PATCH,
   * então a tela manda o estado que o usuário está vendo — o que ele acabou de
   * clicar mais o outro como está.
   */
  async function alternarItem(reuniao, item) {
    const novo = {
      som: Boolean(reuniao.checklist_som),
      cadeiras: Boolean(reuniao.checklist_cadeiras),
      [item]: !reuniao[item === 'som' ? 'checklist_som' : 'checklist_cadeiras'],
    };
    // Otimista: a caixinha responde na hora; se o servidor recusar, volta atrás.
    substituir({
      ...reuniao,
      checklist_som: novo.som ? 1 : 0,
      checklist_cadeiras: novo.cadeiras ? 1 : 0,
    });
    try {
      const r = await salvarChecklist(reuniao.id, novo);
      substituir(r.reuniao);
    } catch (e) {
      setErro(e.message);
      substituir(reuniao);
    }
  }

  return (
    <section>
      <header className="cabecalho-secao">
        <div>
          <h1>Agenda</h1>
          <p className="sub">
            {reunioes.length} reuni{reunioes.length === 1 ? 'ão' : 'ões'} — mais recentes primeiro
          </p>
        </div>
        {/* No celular este botão some: o atalho da barra do topo faz o mesmo e
            fica sempre visível — dois botões iguais só ocupariam a tela. */}
        <button className="botao primario oculto-celular" onClick={aoNovaReuniao}>
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
            <ItemReuniao
              key={r.id}
              reuniao={r}
              aberto={alocando === r.id}
              aoAbrir={() => setAlocando(alocando === r.id ? null : r.id)}
              aoAlternarItem={(item) => alternarItem(r, item)}
              aoAtualizar={(atualizada) => {
                substituir(atualizada);
                setAlocando(null);
              }}
              aoRecarregar={carregar}
              aoErro={setErro}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemReuniao({ reuniao: r, aberto, aoAbrir, aoAlternarItem, aoAtualizar, aoRecarregar, aoErro }) {
  const [presentes, setPresentes] = useState('');
  const [salvando, setSalvando] = useState(false);

  const realizada = r.status === 'realizada';

  async function concluir() {
    const n = Number(presentes);
    if (!Number.isInteger(n) || n < 0) {
      aoErro('Informe o número de presentes (um número inteiro).');
      return;
    }
    setSalvando(true);
    try {
      const resp = await marcarRealizada(r.id, n);
      aoAtualizar(resp.reuniao);
    } catch (e) {
      aoErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <li className={`cartao reuniao ${realizada ? 'concluida' : ''}`}>
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

        {/* RN-05: som e cadeiras. Depois de realizada, o checklist congela —
            já aconteceu, não há mais o que providenciar. */}
        <div className="checklist">
          <label className={r.checklist_som ? 'feito' : ''}>
            <input
              type="checkbox"
              checked={Boolean(r.checklist_som)}
              disabled={realizada}
              onChange={() => aoAlternarItem('som')}
            />
            Som
          </label>
          <label className={r.checklist_cadeiras ? 'feito' : ''}>
            <input
              type="checkbox"
              checked={Boolean(r.checklist_cadeiras)}
              disabled={realizada}
              onChange={() => aoAlternarItem('cadeiras')}
            />
            Cadeiras
          </label>
        </div>
      </div>

      <div className="reuniao-status">
        <span className={`status ${r.status}`}>{ROTULO_STATUS[r.status]}</span>

        {realizada ? (
          <span className="presentes-registrados">{r.presentes} presentes</span>
        ) : (
          <button className="botao pequeno" onClick={aoAbrir}>
            {aberto ? 'Fechar' : r.titular_nome ? 'Trocar palestrante' : 'Alocar palestrante'}
          </button>
        )}
      </div>

      {/* RN-10: só dá para encerrar quando existe titular — o histórico precisa
          responder quem foi falar. */}
      {!realizada && r.titular_nome && (
        <div className="encerrar">
          <label className="campo-presentes">
            <span>Número de presentes</span>
            <input
              type="number"
              min="0"
              value={presentes}
              onChange={(e) => setPresentes(e.target.value)}
              placeholder="ex.: 40"
            />
          </label>
          <button className="botao pequeno" onClick={concluir} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Marcar como realizada'}
          </button>
          <small className="dica">Contagem manual, feita por quem esteve lá.</small>
        </div>
      )}

      {aberto && !realizada && (
        <div className="reuniao-painel">
          <Sugestoes reuniaoId={r.id} aoAtualizar={aoRecarregar} />
        </div>
      )}
    </li>
  );
}
