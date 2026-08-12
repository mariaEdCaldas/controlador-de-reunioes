import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { editarReuniao, listarRegioes, criarRegiao, listarCoordenadores } from './api.js';
import { formatarData, brParaIso } from './regioes.js';
import ReuniaoCampos from './ReuniaoCampos.jsx';

/**
 * Edição das informações de uma reunião (a "canetinha" da Agenda), num modal.
 * Reaproveita os campos da Nova Reunião. Não mexe em titular/reserva/checklist.
 */
export default function EditarReuniao({ reuniao, aoSalvar, aoFechar }) {
  const [regioes, setRegioes] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [form, setForm] = useState({
    nome: reuniao.nome ?? '',
    candidato: reuniao.candidato ?? '',
    regiao: reuniao.regiao ?? '',
    endereco: reuniao.endereco ?? '',
    data: formatarData(reuniao.data ?? ''), // ISO -> dd/mm/aaaa para o campo
    hora: reuniao.hora ?? '',
    coordenador: reuniao.coordenador_nome ?? '',
    qtd_cadeiras: reuniao.qtd_cadeiras ?? '',
    tem_som: Boolean(reuniao.tem_som),
  });
  const [coordSelecionado, setCoordSelecionado] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarRegioes().then(setRegioes).catch((e) => setErroGeral(e.message));
    listarCoordenadores().then((cs) => {
      setCoordenadores(cs);
      setCoordSelecionado(cs.find((c) => c.id === reuniao.coordenador_id) ?? null);
    }).catch(() => {});
  }, [reuniao.coordenador_id]);

  const setCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  // O bairro/região é o do LOCAL da reunião — não herda o bairro do coordenador.
  function mudarCoordenador(e) {
    const valor = e.target.value;
    const match = coordenadores.find(
      (c) => c.nome.toLowerCase() === valor.trim().toLowerCase()
    );
    setForm((f) => ({ ...f, coordenador: valor }));
    setCoordSelecionado(match ?? null);
  }

  async function salvar(evento) {
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

      const atualizada = await editarReuniao(reuniao.id, {
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
      aoSalvar(atualizada);
    } catch (erro) {
      if (Object.keys(erro.campos ?? {}).length > 0) setErros(erro.campos);
      else setErroGeral(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <div className="impressao-overlay" onClick={aoFechar}>
      <div className="editar-caixa" onClick={(ev) => ev.stopPropagation()}>
        <h2>Editar reunião</h2>
        {erroGeral && <p className="aviso erro">{erroGeral}</p>}

        <form onSubmit={salvar} noValidate>
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
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button type="button" className="botao" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
