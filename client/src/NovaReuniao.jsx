import { useEffect, useState } from 'react';
import { criarReuniao, listarRegioes, criarRegiao, listarCoordenadores } from './api.js';
import { brParaIso } from './regioes.js';
import Sugestoes from './Sugestoes.jsx';
import FolhaImpressao from './FolhaImpressao.jsx';
import ReuniaoCampos from './ReuniaoCampos.jsx';

const VAZIO = {
  nome: '', candidato: '', regiao: '', endereco: '',
  data: '', hora: '', coordenador: '', qtd_cadeiras: '', tem_som: true,
};

/**
 * Cadastra a reunião da agenda. Depois de salvar, oferece a folha de impressão
 * (padrão da Agenda Capital) e, opcionalmente, a sugestão de palestrante.
 */
export default function NovaReuniao({ aoConcluir }) {
  const [regioes, setRegioes] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [coordSelecionado, setCoordSelecionado] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criada, setCriada] = useState(null);
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    listarRegioes().then(setRegioes).catch((e) => setErroGeral(e.message));
    listarCoordenadores().then(setCoordenadores).catch(() => {});
  }, []);

  const setCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  // Ao escolher o coordenador, traz o bairro dele para o campo e mostra o
  // telefone. O número final entra na folha via coordenador_id (no back).
  function mudarCoordenador(e) {
    const valor = e.target.value;
    const match = coordenadores.find(
      (c) => c.nome.toLowerCase() === valor.trim().toLowerCase()
    );
    setForm((f) => ({
      ...f,
      coordenador: valor,
      ...(match && match.bairro ? { regiao: match.bairro } : {}),
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
      });
      setCriada(reuniao);
    } catch (erro) {
      if (Object.keys(erro.campos ?? {}).length > 0) setErros(erro.campos);
      else setErroGeral(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  if (criada) {
    return (
      <section>
        <header className="cabecalho-secao">
          <div>
            <h1>Reunião criada</h1>
            <p className="sub">
              <strong>{criada.nome}</strong> — {criada.endereco}. Já pode imprimir a folha.
            </p>
          </div>
          <div className="acoes-form" style={{ marginTop: 0 }}>
            <button className="botao primario" onClick={() => setImprimindo(true)}>
              Imprimir folha
            </button>
            <button className="botao" onClick={() => aoConcluir?.()}>Ir para a agenda</button>
          </div>
        </header>

        {imprimindo && (
          <FolhaImpressao reuniao={criada} aoFechar={() => setImprimindo(false)} />
        )}

        <p className="sub" style={{ margin: '4px 0 12px' }}>
          Se quiser, aloque também um palestrante por proximidade:
        </p>
        <Sugestoes reuniaoId={criada.id} />
      </section>
    );
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
