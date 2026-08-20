import { useEffect, useState } from 'react';
import { criarReuniao, listarRegioes, criarRegiao, listarCoordenadores, listarCabos } from './api.js';
import { brParaIso, formatarTelefone } from './regioes.js';
import ReuniaoCampos from './ReuniaoCampos.jsx';

const VAZIO = {
  nome: '', candidato: '', regiao: '', endereco: '',
  data: '', hora: '', coordenador: '', responsavel: '', responsavel_telefone: '',
  palestrante: '', qtd_cadeiras: '', tem_som: true,
};

/** Junta coordenadores e cabos numa só lista de pessoas (para o Responsável). */
function montarPessoas(coordenadores, cabos) {
  return [
    ...coordenadores.map((c) => ({ nome: c.nome, telefone: c.telefone, chave: `c${c.id}` })),
    ...cabos.map((c) => ({ nome: c.nome, telefone: c.telefone, chave: `b${c.id}` })),
  ];
}

/**
 * Cadastra a reunião da agenda. Depois de salvar, oferece a folha de impressão
 * (padrão da Agenda Capital) e, opcionalmente, a sugestão de palestrante.
 */
export default function NovaReuniao({ aoConcluir, inicial }) {
  const [regioes, setRegioes] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [pessoas, setPessoas] = useState([]); // coordenadores + cabos (p/ Responsável)
  // `inicial` vem de uma proposta (aba Propostas) para pré-preencher o cadastro.
  const [form, setForm] = useState({ ...VAZIO, ...(inicial || {}) });
  const [coordSelecionado, setCoordSelecionado] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarRegioes().then(setRegioes).catch((e) => setErroGeral(e.message));
    Promise.all([listarCoordenadores(), listarCabos()])
      .then(([cs, cbs]) => { setCoordenadores(cs); setPessoas(montarPessoas(cs, cbs)); })
      .catch(() => {});
  }, []);

  // Ao escolher o Responsável na lista (coordenador ou cabo), traz o telefone.
  function mudarResponsavel(e) {
    const valor = e.target.value;
    const p = pessoas.find((x) => x.nome.toLowerCase() === valor.trim().toLowerCase());
    setForm((f) => ({
      ...f,
      responsavel: valor,
      ...(p?.telefone ? { responsavel_telefone: formatarTelefone(p.telefone) } : {}),
    }));
  }

  const setCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  // Ao escolher o coordenador, guardamos só a referência (o telefone dele entra
  // na folha via coordenador_id). O bairro/região é o do LOCAL da reunião, então
  // NÃO herda o bairro do coordenador — quem informa é o campo "Bairro / região".
  function mudarCoordenador(e) {
    const valor = e.target.value;
    const match = coordenadores.find(
      (c) => c.nome.toLowerCase() === valor.trim().toLowerCase()
    );
    // Ao escolher o coordenador: o deputado vinculado entra no campo "Candidatos"
    // e o "Responsável" é pré-preenchido com o nome dele — ambos editáveis.
    setForm((f) => ({
      ...f,
      coordenador: valor,
      responsavel: valor,
      ...(match?.telefone ? { responsavel_telefone: formatarTelefone(match.telefone) } : {}),
      ...(match?.candidato ? { candidato: match.candidato } : {}),
    }));
    setCoordSelecionado(match ?? null);
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroGeral('');

    const dataIso = brParaIso(form.data);

    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe o nome da reunião.';
    if (!form.candidato) e.candidato = 'Escolha o outro candidato.';
    if (!form.endereco.trim()) e.endereco = 'Informe o endereço.';
    if (!form.regiao.trim()) e.regiao = 'Selecione ou digite o bairro.';
    if (!dataIso) e.data = 'Data inválida (use dd/mm/aaaa).';
    if (!form.hora) e.hora = 'Informe a hora.';
    if (Object.keys(e).length > 0) return setErros(e);

    setSalvando(true);
    try {
      const nomeRegiao = form.regiao.trim();
      const regiaoExistente = regioes.find(
        (r) => r.nome.toLowerCase() === nomeRegiao.toLowerCase()
      );
      const regiao = regiaoExistente ?? (await criarRegiao(nomeRegiao));

      const coord = coordenadores.find(
        (c) => c.nome.toLowerCase() === form.coordenador.trim().toLowerCase()
      );

      const reuniao = await criarReuniao({
        nome: form.nome,
        candidato: form.candidato,
        endereco: form.endereco,
        data: dataIso,
        hora: form.hora,
        regiao_id: regiao.id,
        coordenador_id: coord ? coord.id : null,
        qtd_cadeiras: form.qtd_cadeiras === '' ? null : Number(form.qtd_cadeiras),
        tem_som: form.tem_som,
        responsavel: form.responsavel,
        responsavel_telefone: form.responsavel_telefone,
        palestrante: form.palestrante,
      });
      // Salvou: volta direto para a agenda (a reunião já aparece lá). A alocação
      // de palestrante fica só no botão do card, quando/se quiserem.
      aoConcluir?.(reuniao);
    } catch (erro) {
      if (Object.keys(erro.campos ?? {}).length > 0) setErros(erro.campos);
      else setErroGeral(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section>
      <header className="cabecalho-secao">
        <h1>Nova reunião</h1>
        <button className="botao" onClick={() => aoConcluir?.()}>← Voltar para a agenda</button>
      </header>

      <form className="cartao form" onSubmit={enviar} noValidate>
        {erroGeral && <p className="aviso erro">{erroGeral}</p>}

        <ReuniaoCampos
          form={form}
          erros={erros}
          regioes={regioes}
          coordenadores={coordenadores}
          coordSelecionado={coordSelecionado}
          setCampo={setCampo}
          mudarCoordenador={mudarCoordenador}
          pessoas={pessoas}
          mudarResponsavel={mudarResponsavel}
        />

        <div className="acoes-form">
          <button type="submit" className="botao primario" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar reunião'}
          </button>
          <button type="button" className="botao" onClick={() => aoConcluir?.()} disabled={salvando}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
