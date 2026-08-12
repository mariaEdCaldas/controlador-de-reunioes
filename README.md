# Controlador de Reuniões — Agenda de Palestrantes

Sistema local para organizar as reuniões do gabinete durante o período eleitoral:
cadastro de palestrantes, alocação por região + disponibilidade, checklist (som,
cadeiras) e histórico das reuniões realizadas.

Roda **inteiramente na máquina local** — o banco é um arquivo SQLite, não há
servidor externo nem conta em nuvem.

> Estado atual: **Palestrantes**, **Reuniões** (agenda, sugestão por bairro,
> titular/reserva, contato por telefone/WhatsApp, checklist de som e cadeiras),
> **Histórico** (reuniões realizadas com presentes), **Times** e
> **Coordenadores** (carga da planilha + importação de novas planilhas .xlsx/.csv,
> com vínculo aos times), e **Lembretes** por e-mail (véspera e fechamento).

## Requisitos

- **Node.js 20 ou superior** (testado no Node 24) — inclui o `npm`.
  Baixe em <https://nodejs.org> (versão LTS). Para conferir se já está instalado:
  ```bash
  node -v
  npm -v
  ```

Não precisa instalar SQLite separadamente: o banco vem embutido no projeto.

## Instalação

Na pasta do projeto, rode **uma vez**:

```bash
npm run install:all
```

Isso instala as dependências dos três pacotes (raiz, `server` e `client`).
Se preferir fazer na mão, é o equivalente a:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

## Como rodar

```bash
npm run dev
```

Esse comando sobe backend e frontend ao mesmo tempo (via `concurrently`):

| Parte | Endereço | O que é |
|---|---|---|
| Frontend (React/Vite) | <http://localhost:5173> | é aqui que você abre no navegador |
| Backend (Express/API) | <http://localhost:3001> | a API, consumida pelo frontend |

Abra <http://localhost:5173>. Se aparecer **"Front e back conversando"**, está
tudo certo: o React chamou a API e a API leu o banco. Para parar, `Ctrl + C` no
terminal.

Para rodar só um dos lados:

```bash
npm run dev:server
npm run dev:client
```

## Estrutura

```
controlador-de-reunioes/
├── package.json          scripts da raiz (npm run dev sobe tudo)
├── server/               backend — Express + SQLite
│   ├── src/index.js      servidor e rotas da API
│   ├── src/db.js         conexão com o SQLite
│   ├── src/migrations/   os .sql que criam as tabelas (001, 002, …)
│   ├── src/seed.js       dados fictícios de exemplo (opcional)
│   └── data/agenda.db    o banco (criado sozinho no 1º start; fora do Git)
└── client/               frontend — React + Vite
    ├── vite.config.js         proxy de /api para o backend na porta 3001
    ├── src/api.js             todas as chamadas à API ficam aqui
    ├── src/Agenda.jsx         lista de reuniões, checklist, encerramento
    ├── src/NovaReuniao.jsx    cadastro de reunião → sugestões
    ├── src/Sugestoes.jsx      painel de palestrantes sugeridos (RN-03)
    ├── src/Historico.jsx      tabela das reuniões realizadas (RN-10)
    ├── src/whatsapp.js        monta o link wa.me com a mensagem pronta
    ├── src/Palestrantes.jsx   lista de palestrantes
    ├── src/PalestranteForm.jsx  formulário de cadastro/edição
    └── src/regioes.js         a cor fixa de cada bairro
```

### Como front e back conversam

O frontend chama caminhos relativos (`/api/health`, por exemplo) e o Vite
redireciona essas chamadas para `http://localhost:3001` — configurado em
[client/vite.config.js](client/vite.config.js). Ou seja: **não é preciso escrever
o endereço do backend no código do React**, basta chamar `/api/...`.

Rotas disponíveis hoje:

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/health` | status da API, caminho do banco, versão do schema |
| `GET` | `/api/regioes` | lista de bairros (alimenta os selects/autocompletar) |
| `POST` | `/api/regioes` | cria um bairro novo (ou reaproveita, se já existir) |
| `GET` | `/api/palestrantes` | lista; aceita `?regiao_id=2` e `?ativo=0` |
| `POST` | `/api/palestrantes` | cadastra |
| `PUT` | `/api/palestrantes/:id` | edita |
| `PATCH` | `/api/palestrantes/:id/status` | ativa/inativa — corpo: `{"ativo": false}` |
| `GET` | `/api/reunioes` | lista, mais recentes primeiro |
| `POST` | `/api/reunioes` | cria (nasce como `a_confirmar`) |
| `GET` | `/api/reunioes/:id/sugestoes` | palestrantes ativos, os do mesmo bairro primeiro |
| `PATCH` | `/api/reunioes/:id/titular` | define o titular e confirma — `{"palestrante_id": 3}` |
| `PATCH` | `/api/reunioes/:id/reserva` | define a reserva — `null` remove |
| `PATCH` | `/api/reunioes/:id/checklist` | som e cadeiras — `{"som": true, "cadeiras": false}` |
| `PATCH` | `/api/reunioes/:id/realizada` | encerra e registra presença — `{"presentes": 40}` |

`GET /api/reunioes?status=realizada` é o que alimenta a tela de Histórico.

| `GET` | `/api/times` · `/api/coordenadores` | listagens (times com contagem) |
| `POST` | `/api/times` · `/api/coordenadores` | cadastro |
| `PATCH` | `/api/coordenadores/:id/time` | vincula/desvincula do time |
| `POST` | `/api/coordenadores/importar/previa` | lê a planilha e mostra o que seria importado |
| `POST` | `/api/coordenadores/importar/confirmar` | grava a importação |
| `GET` | `/api/lembretes/previa` | reuniões de amanhã + prévia do e-mail |
| `POST` | `/api/lembretes/enviar` | dispara os lembretes agora |

**Reunião realizada não pode mais ser alterada** — nem o titular, nem o
checklist. Ela virou prestação de contas, e mudar quem foi falar depois do fato
faria o histórico mentir. A API recusa, e a tela nem oferece os botões.

Não existe `DELETE` de palestrante de propósito: ele pode estar ligado a reuniões
já realizadas, e excluir o cadastro apagaria essa parte do histórico (RN-10).
Inativar tira a pessoa das sugestões novas sem mexer no passado.

O telefone é sempre **guardado** como `5567999998888` (formato que o link do
WhatsApp exige, RN-07), mas pode ser **digitado** como `(67) 99999-8888` — a API
normaliza.

### Contato com o palestrante (RN-07)

Cada palestrante sugerido tem dois botões: **Ligar** (link `tel:`, abre o
discador) e **Chamar no WhatsApp** (link `wa.me`, abre a conversa com a mensagem
já escrita — data, hora, local e bairro da reunião). Só falta apertar "enviar".

Isso é gratuito e não depende de nenhuma conta ou chave de API. O que ele **não**
faz é saber a resposta: se o palestrante responder "posso sim", alguém precisa
vir ao sistema e marcar o titular. Automatizar essa volta exigiria a API oficial
paga do WhatsApp Business, decisão que ficou fora do escopo — a explicação
completa está em [client/src/whatsapp.js](client/src/whatsapp.js), que também é o
arquivo onde se muda o texto da mensagem.

## Identidade visual

Coluna lateral verde escuro (número 22.222, nome, lema e navegação), área
principal em papel/bege com cards brancos. Paleta fechada: **verde escuro** na
lateral, **verde** nas ações primárias, **dourado** nas secundárias e destaques.
Sem outras cores fortes — as exceções são as bolinhas de bairro (identificação,
uma cor fixa por região, igual em todas as telas) e o vermelho de erro.

As fontes são **só as do sistema operacional** — nenhuma fonte é baixada da
internet. O sistema abre e fica idêntico mesmo sem conexão. Se for mexer no
visual, mantenha isso: um `@import` de Google Fonts quebraria o uso offline.

Tudo está em [client/src/styles.css](client/src/styles.css) (as cores, no `:root`
do topo) e em [client/src/regioes.js](client/src/regioes.js) (a cor de cada
bairro). Em telas estreitas, a lateral vira uma barra horizontal no topo.

## Folha de impressão da reunião

Cada reunião pode ser impressa (ou salva em PDF) no padrão da Agenda Capital:
botão **Imprimir** em cada item da Agenda, ou logo depois de cadastrar. Abre a
folha com o cabeçalho da dupla (Paulo Corrêa + o outro responsável) e a caixa
com data/dia, horário, nome, endereço, contato do coordenador, cadeiras e som.
Use `Imprimir / Salvar PDF` — dá para mandar direto para a impressora ou salvar
em PDF.

### As artes do cabeçalho

O cabeçalho usa a arte (com as fotos) de cada candidato, em
[client/public/artes/](client/public/artes/), com o nome `<slug>.png`
(`rose-modesto.png`, `jaime-verruck.png`, `viviane-luiza.png`, etc. — a lista
completa está no `LEIA-ME.txt` de lá). Enquanto o arquivo não estiver lá, a
folha usa um cabeçalho provisório no mesmo estilo, só com os nomes (sem fotos).
Basta soltar os PNGs na pasta — não precisa reiniciar nada.

> Observação: os campos novos (nome, responsáveis, coordenador, cadeiras, som)
> são preenchidos no cadastro de **novas** reuniões. Reuniões antigas, criadas
> antes disso, saem na folha com o que tinham.

## Lembretes por e-mail (véspera das reuniões)

São dois e-mails automáticos:

1. **Véspera** — no dia anterior à reunião, com os dados dela e o lembrete do
   aluguel de mesa, cadeiras e som (destacando o que ainda está pendente).
   Roda uma vez por dia (8h por padrão).
2. **Fechamento** — depois que a reunião já deve ter terminado (horário + 2h de
   duração prevista, ajustável em `DURACAO_HORAS`), avisa se dá para **fechá-la
   na agenda**: "pode fechar" quando há palestrante titular, ou "falta titular"
   quando ainda não dá para marcar como realizada. O sistema confere isso a cada
   15 minutos.

Os e-mails vão, por padrão, para `mariaeduardacaldas1@gmail.com` e
`wanessacaldass@hotmail.com` (editável em
[server/src/config-lembretes.js](server/src/config-lembretes.js)).

Todos os horários (véspera às 8h, fim previsto das reuniões) seguem o fuso de
**Campo Grande / MS** (UTC−4), independente do fuso configurado no computador —
ver [server/src/fuso.js](server/src/fuso.js).

### Ligar o envio (uma vez)

O envio usa seu próprio Gmail, de graça, mas precisa de uma **senha de app** do
Google (não é a senha normal da conta):

1. Ative a verificação em 2 etapas: <https://myaccount.google.com/security>
2. Gere uma senha de app: <https://myaccount.google.com/apppasswords>
3. Na pasta `server/`, copie `.env.example` para `.env` e cole a senha em `SMTP_PASS`.
4. Reinicie o sistema (`npm run dev`).

A aba **Lembretes** mostra se está configurado, as reuniões de amanhã, uma prévia
do e-mail e um botão **Enviar e-mail agora** para testar. O arquivo `.env` fica
só na sua máquina — não vai para o Git.

### Duas limitações importantes

- **O computador precisa estar ligado** com o sistema rodando no horário do
  disparo (8h por padrão). Sendo um sistema local, ele não "acorda" sozinho —
  se estiver desligado na hora, o e-mail daquele dia não sai. O botão *Enviar
  agora* é a alternativa manual.
- **WhatsApp automático não tem caminho gratuito.** Disparar sozinho de um número
  exige a API oficial paga do WhatsApp Business (custo por conversa + um servidor
  na internet para receber respostas) ou um robô fora dos termos do WhatsApp
  (risco de bloquear o número). Por isso o WhatsApp aqui é **manual**: um botão
  que abre a conversa com a mensagem pronta, faltando só apertar enviar.

## O banco de dados

- Fica em `server/data/agenda.db`, criado automaticamente no primeiro start.
- **Não é versionado no Git** (está no `.gitignore`), porque é um arquivo de
  dados, não de código.
- Para fazer backup ou levar os dados para outro computador, basta copiar esse
  arquivo. Para zerar o sistema, apague-o — ele é recriado vazio no próximo start.

### Tabelas

| Tabela | O que guarda |
|---|---|
| `regioes` | bairros/regiões, no padrão `Bairro/Região` (os 71 de Campo Grande, ex.: Amambaí/Centro) |
| `palestrantes` | nome, telefone, região, temas, ativo |
| `reunioes` | local, endereço, região, data, hora, status, titular, reserva, checklist, presentes |
| `migracoes` | controle interno de quais migrations já rodaram |

`palestrantes.regiao_id` e `reunioes.regiao_id` apontam para a **mesma** tabela
`regioes`. É isso que permite a sugestão automática da RN-03: comparar a região
da reunião com a região dos palestrantes.

No cadastro de reunião, o campo de bairro é digitável: escolhe-se um da lista
(autocompletar) **ou digita-se um novo**, que é criado ao salvar. Nomes iguais
(ignorando maiúsculas/acentos de caixa) não duplicam.

O banco recusa dados inconsistentes por conta própria — telefone com máscara,
data fora do padrão, status inventado, palestrante como titular *e* reserva da
mesma reunião, ou o mesmo titular em duas reuniões na mesma data/hora (RN-02).

### Migrations

O schema é criado por arquivos `.sql` numerados em `server/src/migrations/`.
As pendentes são aplicadas sozinhas quando o servidor sobe, então basta rodar
`npm run dev` que o banco fica em dia. Para mudar o schema depois, **crie um
arquivo novo** (`003_...sql`) em vez de editar um já aplicado — quem já tem
banco recebe só a mudança nova, sem perder os dados.

### Comandos do banco

Rodados de dentro da pasta `server/`:

```bash
npm run migrate                # aplica migrations pendentes e lista as aplicadas
npm run seed                   # popula 5 palestrantes e 2 reuniões de exemplo
npm run seed -- --force        # apaga esses dados e recria os exemplos
npm run db:reset -- --confirmar  # APAGA o banco inteiro e recria vazio
```

O `seed` é **opcional**, só para testar o sistema com dados fictícios. O banco
de verdade do gabinete começa vazio — não rode o seed nele.

## Levando para outro computador

1. Instale o Node.js (link acima).
2. Copie a pasta do projeto **sem** as pastas `node_modules` (ou clone do Git).
3. `npm run install:all`
4. `npm run dev`

As dependências são reinstaladas do zero na máquina nova — por isso `node_modules`
não deve ser copiado entre computadores.

## Problemas comuns

- **"Sem resposta da API" na tela** — o backend não subiu. Olhe o terminal:
  as linhas com o prefixo `[server]` mostram o erro.
- **`EADDRINUSE` (porta ocupada)** — já existe algo rodando na 3001 ou na 5173.
  Feche a outra janela/terminal, ou mude a porta em
  [server/src/index.js](server/src/index.js) e em [client/vite.config.js](client/vite.config.js)
  (nesse caso, mude nos dois lugares: o proxy precisa apontar para a porta certa).
- **Erro ao instalar o `better-sqlite3`** — ele usa um componente nativo. Costuma
  se resolver com `npm --prefix server install` de novo; persistindo, confirme a
  versão do Node (`node -v`, precisa ser 20+).
