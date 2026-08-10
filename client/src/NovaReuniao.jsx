import { useEffect, useState } from 'react';
import { criarReuniao, listarRegioes, criarRegiao } from './api.js';
import Sugestoes from './Sugestoes.jsx';

const VAZIO = { local: '', regiao: '', endereco: '', data: '', hora: '' };

/**
 * Cadastra a reunião e, assim que ela existe, mostra os palestrantes sugeridos
 * na mesma tela — o fluxo real do gabinete: lança a reunião, olha quem é do
 * bairro, liga para a pessoa e confirma (RN-04).
 */
export default function NovaReuniao({ aoConcluir }) {
  const [regioes, setRegioes] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criada, setCriada] = useState(null);

  useEffect(() => {
    listarRegioes().then(setRegioes).catch((e) => setErroGeral(e.message));
  }, []);

  const mudar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  async function enviar(evento) {
    evento.preventDefault();
    setErroGeral('');

    const e = {};
    if (!form.local.trim()) e.local = 'Informe o local.';
    if (!form.endereco.trim()) e.endereco = 'Informe o endereço.';
    if (!form.regiao.trim()) e.regiao = 'Selecione ou digite o bairro.';
    if (!form.data) e.data = 'Informe a data.';
    if (!form.hora) e.hora = 'Informe a hora.';
    if (Object.keys(e).length > 0) return setErros(e);

    setSalvando(true);
    try {
      // Resolve o bairro digitado para um id: usa o existente (ignorando caixa)
      // ou cria um novo na hora.
      const nomeRegiao = form.regiao.trim();
      const existente = regioes.find(
        (r) => r.nome.toLowerCase() === nomeRegiao.toLowerCase()
      );
      const regiao = existente ?? (await criarRegiao(nomeRegiao));

      const reuniao = await criarReuniao({
        local: form.local,
        endereco: form.endereco,
        data: form.data,
        hora: form.hora,
        regiao_id: regiao.id,
      });
      setCriada(reuniao);
    } catch (erro) {
      if (Object.keys(erro.campos ?? {}).length > 0) setErros(erro.campos);
      else setErroGeral(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  // Fase 2: a reunião já existe, agora se escolhe quem vai.
  if (criada) {
    return (
      <section>
        <header className="cabecalho-secao">
          <div>
            <h1>Reunião criada</h1>
            <p className="sub">
              Está como <strong>a confirmar</strong>. Ela só fica confirmada quando
              um titular for definido.
            </p>
          </div>
          <button className="botao" onClick={() => aoConcluir?.()}>
            Ir para a agenda
          </button>
        </header>

        <Sugestoes reuniaoId={criada.id} />
      </section>
    );
  }

  return (
    <section>
      <header className="cabecalho-secao">
        <h1>Nova reunião</h1>
      </header>

      <form className="cartao form" onSubmit={enviar} noValidate>
        {erroGeral && <p className="aviso erro">{erroGeral}</p>}

        <div className="linha">
          <label className="campo">
            <span>Local <b aria-hidden="true">*</b></span>
            <input
              value={form.local}
              onChange={mudar('local')}
              placeholder="Coopatrabalho"
              autoFocus
              aria-invalid={Boolean(erros.local)}
            />
            {erros.local && <small className="erro-campo">{erros.local}</small>}
          </label>

          <label className="campo">
            <span>Bairro / região <b aria-hidden="true">*</b></span>
            <input
              list="lista-regioes"
              value={form.regiao}
              onChange={mudar('regiao')}
              placeholder="Digite ou escolha (ex.: Amambaí/Centro)"
              aria-invalid={Boolean(erros.regiao)}
            />
            <datalist id="lista-regioes">
              {regioes.map((r) => (
                <option key={r.id} value={r.nome} />
              ))}
            </datalist>
            {erros.regiao ? (
              <small className="erro-campo">{erros.regiao}</small>
            ) : (
              <small className="dica">
                Pode digitar um bairro novo — ele é criado ao salvar. É por aqui que os
                palestrantes são sugeridos.
              </small>
            )}
          </label>
        </div>

        <div className="linha">
          <label className="campo">
            <span>Endereço <b aria-hidden="true">*</b></span>
            <input
              value={form.endereco}
              onChange={mudar('endereco')}
              placeholder="Rua das Garças, 1420"
              aria-invalid={Boolean(erros.endereco)}
            />
            {erros.endereco && <small className="erro-campo">{erros.endereco}</small>}
          </label>
        </div>

        <div className="linha">
          <label className="campo">
            <span>Data <b aria-hidden="true">*</b></span>
            <input
              type="date"
              value={form.data}
              onChange={mudar('data')}
              aria-invalid={Boolean(erros.data)}
            />
            {erros.data && <small className="erro-campo">{erros.data}</small>}
          </label>

          <label className="campo">
            <span>Hora <b aria-hidden="true">*</b></span>
            <input
              type="time"
              value={form.hora}
              onChange={mudar('hora')}
              aria-invalid={Boolean(erros.hora)}
            />
            {erros.hora && <small className="erro-campo">{erros.hora}</small>}
          </label>
        </div>

        <div className="acoes-form">
          <button type="submit" className="botao primario" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar e ver sugestões'}
          </button>
        </div>
      </form>
    </section>
  );
}
