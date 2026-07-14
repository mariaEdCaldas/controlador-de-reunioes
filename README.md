# Controlador de Reuniões — Agenda de Palestrantes

Sistema local para organizar as reuniões do gabinete durante o período eleitoral:
cadastro de palestrantes, alocação por região + disponibilidade, checklist (som,
cadeiras) e histórico das reuniões realizadas.

Roda **inteiramente na máquina local** — o banco é um arquivo SQLite, não há
servidor externo nem conta em nuvem.

> Estado atual: **Palestrantes** (cadastro, edição, filtro por bairro,
> ativar/inativar), **Reuniões** (agenda, sugestão de palestrante por bairro,
> titular e reserva, contato por telefone/WhatsApp, checklist de som e cadeiras)
> e **Histórico** (reuniões realizadas com número de presentes).
> Falta: lembretes automáticos (RN-06).

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
| `GET` | `/api/regioes` | lista fixa de bairros (alimenta os selects) |
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

## O banco de dados

- Fica em `server/data/agenda.db`, criado automaticamente no primeiro start.
- **Não é versionado no Git** (está no `.gitignore`), porque é um arquivo de
  dados, não de código.
- Para fazer backup ou levar os dados para outro computador, basta copiar esse
  arquivo. Para zerar o sistema, apague-o — ele é recriado vazio no próximo start.

### Tabelas

| Tabela | O que guarda |
|---|---|
| `regioes` | lista fixa de bairros/regiões (Centro, Coophavila, …) |
| `palestrantes` | nome, telefone, região, temas, ativo |
| `reunioes` | local, endereço, região, data, hora, status, titular, reserva, checklist, presentes |
| `migracoes` | controle interno de quais migrations já rodaram |

`palestrantes.regiao_id` e `reunioes.regiao_id` apontam para a **mesma** tabela
`regioes`. É isso que permite a sugestão automática da RN-03: comparar a região
da reunião com a região dos palestrantes.

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
