import { useState } from 'react';
import { criarPalestrante, editarPalestrante } from './api.js';

const VAZIO = { nome: '', telefone: '', regiao_id: '', temas: '' };

/**
 * Formulário de cadastro e edição. O mesmo componente serve para os dois:
 * se receber `palestrante`, edita (PUT); se não, cria (POST).
 */
export default function PalestranteForm({ palestrante, regioes, aoSalvar, aoCancelar }) {
  const editando = Boolean(palestrante);

  const [form, setForm] = useState(
    editando
      ? {
          nome: palestrante.nome,
          telefone: palestrante.telefone,
          regiao_id: String(palestrante.regiao_id),
          temas: palestrante.temas,
        }
      : VAZIO
  );
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  // Validação básica na tela, para não gastar ida ao servidor com campo vazio.
  // O servidor valida de novo — ele é quem manda (a tela pode ser burlada).
  function validarLocal() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório.';
    if (!form.regiao_id) e.regiao_id = 'Selecione o bairro.';
    return e;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroGeral('');

    const locais = validarLocal();
    if (Object.keys(locais).length > 0) {
      setErros(locais);
      return;
    }

    setSalvando(true);
    try {
      const dados = { ...form, regiao_id: Number(form.regiao_id) };
      const salvo = editando
        ? await editarPalestrante(palestrante.id, dados)
        : await criarPalestrante(dados);
      aoSalvar(salvo);
    } catch (erro) {
      // Erros por campo (ex.: telefone que o servidor não conseguiu entender)
      // aparecem embaixo do campo; o resto, no topo do formulário.
      if (Object.keys(erro.campos ?? {}).length > 0) setErros(erro.campos);
      else setErroGeral(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="cartao form" onSubmit={enviar} noValidate>
      <h2>{editando ? 'Editar palestrante' : 'Novo palestrante'}</h2>

      {erroGeral && <p className="aviso erro">{erroGeral}</p>}

      <div className="linha">
        <label className="campo">
          <span>Nome <b aria-hidden="true">*</b></span>
          <input
            value={form.nome}
            onChange={mudar('nome')}
            autoFocus
            aria-invalid={Boolean(erros.nome)}
          />
          {erros.nome && <small className="erro-campo">{erros.nome}</small>}
        </label>

        <label className="campo">
          <span>Telefone (WhatsApp) <b aria-hidden="true">*</b></span>
          <input
            value={form.telefone}
            onChange={mudar('telefone')}
            placeholder="(67) 99999-8888"
            inputMode="tel"
            aria-invalid={Boolean(erros.telefone)}
          />
          {erros.telefone ? (
            <small className="erro-campo">{erros.telefone}</small>
          ) : (
            <small className="dica">Pode digitar com parênteses e traço.</small>
          )}
        </label>
      </div>

      <div className="linha">
        <label className="campo">
          <span>Bairro / região <b aria-hidden="true">*</b></span>
          <select
            value={form.regiao_id}
            onChange={mudar('regiao_id')}
            aria-invalid={Boolean(erros.regiao_id)}
          >
            <option value="">Selecione…</option>
            {regioes.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
          {erros.regiao_id && <small className="erro-campo">{erros.regiao_id}</small>}
        </label>

        <label className="campo">
          <span>Temas</span>
          <input
            value={form.temas}
            onChange={mudar('temas')}
            placeholder="Saúde, Educação"
          />
          <small className="dica">Separe por vírgula.</small>
        </label>
      </div>

      <div className="acoes-form">
        <button type="submit" className="botao primario" disabled={salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar'}
        </button>
        <button type="button" className="botao" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
