import { formatarTelefone, mascaraData } from './regioes.js';
import { CANDIDATOS } from './candidatos.js';
import { SUGESTOES_BAIRRO } from './regioesCampoGrande.js';

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = ['00', '15', '30', '45'];

/**
 * Campos da reunião, compartilhados entre "Nova reunião" e a edição pela Agenda.
 * Só os inputs — o <form>, os botões e o salvar ficam com quem usa.
 *
 * `setCampo(campo, valor)` atualiza o formulário do pai. A data é digitada como
 * dd/mm/aaaa (o pai converte para ISO ao salvar); a hora é escolhida em dois
 * seletores (hora e minuto).
 */
export default function ReuniaoCampos({
  form, erros, regioes, coordenadores, coordSelecionado, setCampo, mudarCoordenador,
}) {
  const [horaSel = '', minSel = ''] = String(form.hora ?? '').split(':');

  // Lista completa para o campo de bairro: todos os bairros oficiais (com a
  // região) mais o que já existir no banco, sem repetir.
  // Só a lista oficial (curada). Não mistura o que está no banco para não trazer
  // grafias/vínculos antigos (ex.: "Coophavila II/Imbirussu" da carga inicial).
  const opcoesBairro = SUGESTOES_BAIRRO;

  return (
    <>
      <div className="linha">
        <label className="campo">
          <span>Nome da reunião <b aria-hidden="true">*</b></span>
          <input
            value={form.nome}
            onChange={(e) => setCampo('nome', e.target.value)}
            placeholder="Reunião entre amigos"
            aria-invalid={Boolean(erros.nome)}
          />
          {erros.nome && <small className="erro-campo">{erros.nome}</small>}
        </label>

        <label className="campo">
          <span>Candidatos <b aria-hidden="true">*</b></span>
          <div className="dupla-responsavel">
            <span className="fixo">Paulo Corrêa</span>
            <span className="mais">e</span>
            <select
              value={form.candidato}
              onChange={(e) => setCampo('candidato', e.target.value)}
              aria-invalid={Boolean(erros.candidato)}
            >
              <option value="">Selecione…</option>
              {CANDIDATOS.map((c) => (
                <option key={c.slug} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>
          {erros.candidato && <small className="erro-campo">{erros.candidato}</small>}
        </label>
      </div>

      <div className="linha">
        <label className="campo">
          <span>Contato (coordenador)</span>
          <input
            list="lista-coordenadores"
            value={form.coordenador}
            onChange={mudarCoordenador}
            placeholder="Busque um coordenador cadastrado"
          />
          <datalist id="lista-coordenadores">
            {coordenadores.map((c) => (
              <option key={c.id} value={c.nome} />
            ))}
          </datalist>
          {coordSelecionado ? (
            <small className="dica">
              Tel: {formatarTelefone(coordSelecionado.telefone) || 'sem número'} — entra na folha.
              O bairro da reunião é o do local (abaixo), não o do coordenador.
            </small>
          ) : (
            <small className="dica">Ao escolher, o telefone dele entra na folha. O bairro é o do local da reunião.</small>
          )}
        </label>

        <label className="campo">
          <span>Bairro / região <b aria-hidden="true">*</b></span>
          <input
            list="lista-regioes"
            value={form.regiao}
            onChange={(e) => setCampo('regiao', e.target.value)}
            placeholder="Digite ou escolha (ex.: Amambaí/Centro)"
            aria-invalid={Boolean(erros.regiao)}
          />
          <datalist id="lista-regioes">
            {opcoesBairro.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
          {erros.regiao && <small className="erro-campo">{erros.regiao}</small>}
        </label>
      </div>

      <div className="linha">
        <label className="campo">
          <span>Endereço <b aria-hidden="true">*</b></span>
          <input
            value={form.endereco}
            onChange={(e) => setCampo('endereco', e.target.value)}
            placeholder="R. Barra Mansa, 1201 - Casa dos Fundos"
            aria-invalid={Boolean(erros.endereco)}
          />
          {erros.endereco && <small className="erro-campo">{erros.endereco}</small>}
        </label>
      </div>

      <div className="linha">
        <label className="campo">
          <span>Data <b aria-hidden="true">*</b></span>
          <input
            value={form.data}
            onChange={(e) => setCampo('data', mascaraData(e.target.value))}
            placeholder="dd/mm/aaaa"
            inputMode="numeric"
            maxLength={10}
            aria-invalid={Boolean(erros.data)}
          />
          {erros.data && <small className="erro-campo">{erros.data}</small>}
        </label>

        <label className="campo">
          <span>Hora <b aria-hidden="true">*</b></span>
          <div className="campo-hora">
            <select
              value={horaSel}
              onChange={(e) => setCampo('hora', `${e.target.value}:${minSel || '00'}`)}
              aria-invalid={Boolean(erros.hora)}
            >
              <option value="">Hora</option>
              {HORAS.map((h) => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </select>
            <select
              value={minSel}
              onChange={(e) => setCampo('hora', `${horaSel || '00'}:${e.target.value}`)}
              disabled={!horaSel}
            >
              {MINUTOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {erros.hora && <small className="erro-campo">{erros.hora}</small>}
        </label>

        <label className="campo campo-estreito">
          <span>Cadeiras</span>
          <input
            type="number"
            min="0"
            value={form.qtd_cadeiras}
            onChange={(e) => setCampo('qtd_cadeiras', e.target.value)}
            placeholder="ex.: 100"
          />
        </label>

        <label className="campo campo-som">
          <span>Som</span>
          <label className="check-som">
            <input
              type="checkbox"
              checked={form.tem_som}
              onChange={(e) => setCampo('tem_som', e.target.checked)}
            />
            Vai ter som
          </label>
        </label>
      </div>
    </>
  );
}
