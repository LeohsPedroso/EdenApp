# Changelog — revisão página por página (app + backend)

Registro de tudo que foi alterado durante a revisão sistemática, tela por
tela. Cada entrada diz o que foi encontrado, o que foi mudado, e em quais
arquivos.

---

## Tela de Login / Vínculo

### 1. Login de conta existente não funcionava (`POST /app/auth/login` não existia)
- **Backend:** implementada a rota `POST /app/auth/login` em `src/routes/app.js`.
- Recebe `{nick, password}`, valida contra o hash salvo, devolve o mesmo
  formato de token que `/app/link/confirm`.

### 2. Senha era ignorada — qualquer senha "funcionava"
- **Backend:** `POST /app/link/confirm` agora recebe `{code, password}` de
  verdade, valida tamanho mínimo (6 caracteres, igual a validação que já
  existia no app) e salva um hash da senha (nunca a senha em texto puro).
- Hash feito com `crypto.scrypt` (nativo do Node, sem depender de pacote
  externo como bcrypt) — arquivo novo: `src/password.js`.
- `db.upsertUser` agora aceita um `passwordHash` opcional (não sobrescreve
  se não for passado, pra não quebrar nada que chame sem senha).

### 3. Recuperação de senha
- Não precisou de rota nova — o modo "recuperar" do app já reaproveita o
  mesmo `POST /app/link/confirm` (novo código do `/vincular` + nova
  senha), que com a correção acima agora atualiza a senha de verdade.

### 4. App nunca lembrava login (voltava pra tela de vínculo sempre)
- **App:** sessão (token + nick + uuid) agora é salva em `localStorage` ao
  logar, e restaurada automaticamente ao abrir o app. Também adicionado um
  botão de "sair" nas Configurações pra limpar isso de propósito.
- Tradeoff conhecido: `localStorage` de WebView pode ser limpo se o
  usuário limpar o cache/dados do app manualmente nas configurações do
  Android. Pra algo mais robusto, dá pra migrar futuramente pro plugin
  `@capacitor/preferences` (storage nativo) — não fiz isso agora pra não
  precisar adicionar dependência nova/nativa nesse momento do projeto.

**Arquivos alterados:** `edenmc-backend/src/db.js`,
`edenmc-backend/src/routes/app.js`, `edenmc-backend/src/password.js` (novo),
`edenmc-mobile/src/App.jsx`

**Testes:** `edenmc-backend/test-auth.js` (novo) — todas as 9 verificações
passando, mais a bateria completa de regressão (12 suítes) sem quebrar nada.

⚠️ **A parte do app (`App.jsx`) não pôde ser testada de verdade** — meu
ambiente não tem internet pra instalar as dependências e rodar o build.
Revisei o código com cuidado, mas o primeiro teste real vai ser o build do
GitHub Actions. Se der erro vermelho lá, me manda o log.

---

## Login por e-mail (alternativa ao nick)

### O que mudou
- **Backend:** `POST /app/link/confirm` agora aceita um campo `email`
  opcional (valida formato básico, e recusa se o e-mail já estiver em uso
  por outra conta). `POST /app/auth/login` agora aceita `identifier`
  (nick OU e-mail, detecta automaticamente pela presença de `@`) no lugar
  de exigir só `nick` — mantém compatibilidade com quem ainda manda
  `nick` no corpo da requisição.
- **App:** tela de criação de senha (1º vínculo) ganhou um campo de
  e-mail opcional. Tela de login trocou "Nick" por "Nick ou e-mail".

### Ferramenta de teste sem precisar gerar APK
- `public/test-client.html` (a página de teste que já existia, só pra
  chat) foi reescrita pra incluir os fluxos completos de **vincular** e
  **entrar**, com senha e e-mail — assim dá pra testar qualquer mudança
  de login direto no navegador de qualquer aparelho, sem esperar o build
  do GitHub Actions. Também ajuda a diagnosticar problemas de rede: se o
  vínculo funcionar nessa página mas não no app, o problema é do WebView
  do app, não da rede/túnel/backend.

**Arquivos alterados:** `edenmc-backend/src/db.js`,
`edenmc-backend/src/routes/app.js`, `edenmc-backend/public/test-client.html`,
`edenmc-mobile/src/App.jsx`

**Testes:** `edenmc-backend/test-auth.js` (ampliado, +6 casos novos de
e-mail) — 15 casos passando, mais a bateria completa de regressão.

⚠️ Mesmo aviso de antes: a parte do `App.jsx` não pôde ser testada de
verdade aqui. Já a página `test-client.html` **foi testada de verdade**
(é só HTML/JS servido pelo próprio backend, sem precisar de build).

---

## Página inicial (Home) + barra de status no topo

### 1. "214 jogadores online" era um número fixo, nunca mudava
- **App:** `TopStatus` (barra fixa no topo, aparece em todo lugar) e
  `HomeScreen` usavam uma constante `PLAYERS_ONLINE = 214` deixada do
  protótipo. Substituído por uma chamada de verdade a
  `GET /app/players/online` (rota que já existia e já era testada), com
  atualização automática a cada 30s no `TopStatus`.
- Constante `PLAYERS_ONLINE` removida (não tem mais uso nenhum).

**Arquivos alterados:** `edenmc-mobile/src/App.jsx`

---

## Mural (Feed de novidades)

### 1. Contrato inteiro entre app e backend não batia
- O app manda `{title, body, media}` pro publicar, e espera de volta
  `{id, author_nick, created_at, title, body, media}` na listagem.
- O backend (implementado numa sessão anterior, sem essa tela em mente)
  só sabia de `{text}`, reaproveitando o sistema de chat por baixo — ou
  seja, publicar pelo app **sempre falhava** ("texto obrigatório"), e a
  listagem nunca teria os campos que a tela usa (`title`/`body`
  apareceriam `undefined`).
- **Backend:** criado um armazenamento próprio pro Mural (`state.feedPosts`,
  separado do chat), com as funções `createFeedPost`/`listFeedPosts`
  devolvendo exatamente os campos que o app espera.

### 2. Publicar no Mural não era restrito a staff de verdade
- O app só mostra o botão "Postar" pra quem é staff, mas o backend deixava
  qualquer jogador logado publicar diretamente pela API. Corrigido com a
  mesma checagem `db.isStaff()` já usada nas Sugestões.

### 3. Conflito com a missão "Voz da comunidade" do EdenPoints
- Essa missão (criada numa sessão anterior) presumia que qualquer jogador
  pudesse postar no Mural — mas o Mural sempre foi pensado como staff-only
  no design do app. Como o app já tem uma tela onde qualquer jogador
  publica algo pra comunidade (Sugestões), movi o gatilho da missão pra lá
  (`POST /app/suggestions/create`) em vez do Mural. Descrição da missão
  atualizada pra refletir isso.
- Nota: existe também uma aba chamada "Mural" **dentro da tela de Loja**
  (é o mercado/classificados, tela separada) — nomes iguais, telas
  diferentes. Vale considerar renomear uma das duas no app pra evitar
  confusão, quando chegarmos na revisão de design.

**Arquivos alterados:** `edenmc-backend/src/db.js`,
`edenmc-backend/src/routes/app.js`

**Testes:** `edenmc-backend/test-feed.js` (novo, 9 casos) +
`edenmc-backend/test-points.js` (ajustado pro novo gatilho da missão 4) —
bateria completa (13 suítes) passando.

---

## Chat (app + servidor)

### 1. Mensagens privadas vazavam pra todo mundo — achado mais sério até agora
- **Backend:** todo canal (clã, aliados, tell, DM entre amigos) usava
  `broadcastToApp`, que manda a mensagem pra **qualquer um** conectado no
  app naquele momento — não filtrava por quem realmente deveria ver.
  Na prática: uma mensagem de clã aparecia pra jogadores de fora do clã,
  e um "tell" (mensagem privada) aparecia pra qualquer pessoa com o app
  aberto, não só o destinatário.
- Corrigido: cada canal agora resolve o público certo antes de entregar —
  `cla`/`app-cla` só pros membros do próprio clã, `aliados`/`app-aliados`
  só pros membros dos clãs aliados, `tell`/`app-dm` só pro destinatário
  específico. `global` continua público (é o esperado). Usa as mesmas
  tabelas de clã/aliança que já existiam (`clan_members`,
  `clan_alliances`), sem precisar de dado novo.
- Também corrigido o `targetUuids` que o plugin espera receber no relay de
  clã/aliados (documentado no próprio `ChatBridgeListener.java`, mas o
  backend nunca preenchia isso — sempre mandava `null`, então mensagens do
  app pro canal de clã/aliados nunca apareciam de volta no jogo).

### 2. Bug de estabilidade descoberto ao testar o item 1: uma conexão morta podia derrubar o servidor inteiro
- Ao escrever o teste do item 1, um teste com várias conexões WebSocket
  abrindo/fechando em sequência **crashou o servidor de verdade** com
  `Error: write EPIPE` não tratado.
- Causa raiz: no Node, um evento `"error"` emitido sem ninguém escutando é
  **fatal por padrão** — derruba o processo inteiro. Uma conexão que cai
  de forma abrupta (rede instável, app fechado bruscamente, etc.) é
  normal e esperado; isso nunca deveria conseguir tirar o servidor do ar
  pra todo mundo.
- Corrigido em duas camadas: (1) `src/wsServer.js` agora nunca propaga um
  erro de socket como evento não-escutado — só derruba a conexão
  problemática; (2) `server.js` ganhou um log de erro por conexão (plugin
  e app) e uma rede de segurança geral (`uncaughtException`/
  `unhandledRejection`) que loga e mantém o servidor no ar em vez de
  matar tudo por causa de uma falha isolada.
- **Isso não era só um problema do teste** — o mesmo cenário podia
  acontecer em produção (ex: o Termux perder conexão momentaneamente, ou
  o túnel cair no meio de uma mensagem) e derrubaria o backend pra todo
  mundo, não só pra quem teve o problema de rede.

**Arquivos alterados:** `edenmc-backend/src/db.js`,
`edenmc-backend/server.js`, `edenmc-backend/src/wsServer.js`

**Testes:** `edenmc-backend/test-chat-routing.js` (novo, 9 casos — prova
que nada vaza entre clã/aliados/tell e que `global` continua público).
Bateria completa (14 suítes) rodada em sequência única, incluindo o
cenário exato que causava o crash — servidor confirmado vivo do início ao
fim.

⚠️ Assim como as outras telas, a parte visual do `App.jsx` não foi alterada
nessa etapa (o problema estava inteiramente no backend) — não precisa
gerar APK novo só por causa dessa correção.

---

## Chat — variáveis (áudio, imagem, conexão)

### 1. Duração do áudio gravado sempre salvava como "0:00"
- **App:** o timer que aparece na tela durante a gravação contava certo,
  mas a duração de verdade, gravada junto com o áudio (convenção
  `AUDIO::url::duração`), sempre saía como `0:00` — um bug clássico de
  closure desatualizada em React (o `onstop` do gravador capturava o
  valor do contador do momento em que a gravação *começou*, antes dele
  incrementar, e nunca via as atualizações). Corrigido usando uma `ref`
  (que sempre reflete o valor mais recente) em vez do state direto.

### 2. Fotos grandes sempre falhavam, sem aviso prévio
- **App:** não existia nenhuma compressão ou checagem de tamanho antes de
  enviar uma foto. Câmeras de celular modernas produzem fotos que passam
  fácil dos 15MB (limite do backend) — o app deixava escolher, subia (às
  vezes em dados móveis), e só depois mostrava um erro genérico.
- Corrigido: a imagem agora é redimensionada e comprimida no próprio app
  antes de enviar (via `<canvas>`, máx. 1600px no maior lado, JPEG
  qualidade 82%) — evita o erro na quase totalidade dos casos, e ainda
  economiza dados móveis de quem manda. GIFs são enviados sem alteração
  (comprimir via canvas destruiria a animação).

### 3. Chat ficava mudo pra sempre depois de qualquer soluço de rede
- **App:** o WebSocket do chat nunca tentava reconectar sozinho. Qualquer
  interrupção — trocar de wifi pra dados móveis, o app voltar do segundo
  plano, o backend reiniciar — deixava o chat inteiro mudo pelo resto da
  sessão, sem nenhum aviso além de um indicador discreto de "desconectado".
  Só voltava a funcionar se a pessoa fechasse e abrisse o app de novo.
- Corrigido: reconexão automática com espera crescente (2s, 4s, 8s...
  até 30s no máximo), pra não martelar o servidor se ele cair de verdade
  por um tempo.
- Também adicionada uma checagem pra não tentar mandar mensagem com o
  socket ainda fechado/reconectando (evita um erro silencioso nesse
  instante específico).

**Arquivos alterados:** `edenmc-mobile/src/App.jsx`

⚠️ Essa etapa **mexeu só no app**, nenhuma mudança no backend. Precisa
gerar um APK novo (`git push` + rebuild no GitHub Actions) pra essas
correções valerem. Como sempre, não pude rodar um build de verdade aqui
(sem internet) — revisei o código com cuidado e conferi o balanceamento
de chaves/parênteses do arquivo inteiro, mas o primeiro teste real é o
build do GitHub Actions.

---

## Incidente: domínio excluído do Cloudflare (04/09)

Boa parte de um lote de bugs reportados nesse dia (contador de online
zerado, "Failed to fetch" nos amigos, chat não entregando) tinha uma causa
raiz em comum, **não relacionada a código**: o Cloudflare excluiu a zona
`edenmc.com.br` automaticamente, porque os nameservers pararam de apontar
pra eles. Sem a zona, o `api.edenmc.com.br` parou de resolver — o túnel
(`cloudflared`) continuava "conectando" normalmente (ele autentica pela
conta, não pelo domínio), mas o domínio em si não levava a lugar nenhum.

Resolvido re-adicionando o domínio no Cloudflare e conferindo os
nameservers no registro.br. Vale ficar de olho pra isso não se repetir —
o Cloudflare avisa por e-mail quando algo assim acontece.

## Histórico de chat (mensagens sumiam ao reabrir o app)

O backend sempre guardou as mensagens (`db.addMessage`), mas nunca existia
uma rota pra consultar esse histórico -- o app só tinha as mensagens que
chegavam ao vivo por WebSocket durante a sessão atual. Isso causava dois
sintomas reportados: conversa global sumindo ao fechar/abrir o app, e
mensagens privadas (DM) se perdendo pra sempre se o destinatário não
estivesse com o app aberto no exato momento do envio.

- **Backend:** nova rota `GET /app/chat/history?channel=X&partnerUuid=Y`.
  Cobre `global` (todo mundo) e `tell`/`app-dm` (junta as duas direções da
  conversa entre duas pessoas). `cla`/`aliados` ficam de fora por enquanto
  (combinado, foco no chat do app primeiro).
- **App:** busca o histórico do chat global assim que o WebSocket conecta,
  e o histórico de uma conversa privada assim que ela é aberta (tanto na
  aba Amigos quanto na aba Chat → App). Só busca uma vez por conversa
  (não repete a busca a cada re-render).

**Arquivos alterados:** `edenmc-backend/src/db.js`,
`edenmc-backend/src/routes/app.js`, `edenmc-mobile/src/App.jsx`

**Testes:** `edenmc-backend/test-chat-history.js` (novo, 10 casos) —
bateria completa (15 suítes) passando.

## Áudio: o botão "funcionava" mas nunca gravava nada de verdade

O ícone do microfone ficava com a cor de **erro** (não uma cor neutra) ao
tentar gravar, sem gravar nada. Causa: o app roda dentro de um WebView
(não um navegador completo), e o WebView tem sua **própria camada de
permissão**, separada da permissão do Android — o `getUserMedia()` do
navegador pedia acesso ao microfone, e ninguém no lado nativo respondia
"pode", então a chamada falhava na hora.

- O projeto Android desse app é **gerado do zero a cada build** (não fica
  salvo no repositório) — então a correção não é um arquivo pra editar,
  é um passo novo no workflow do GitHub Actions que "remenda" o projeto
  logo depois dele ser gerado: adiciona a permissão `RECORD_AUDIO` no
  manifest, e sobrescreve o `MainActivity.java` pra conceder a permissão
  ao WebView quando ele pedir.
- ⚠️ Isso mexe em como o WebView lida com permissões de forma geral — não
  deveria afetar o seletor de fotos (que usa `<input type="file">`, um
  mecanismo diferente), mas como não consigo compilar/testar isso aqui,
  **testem tanto áudio quanto foto depois de atualizar o APK**, pra
  garantir que nada quebrou.

**Arquivos alterados:** `edenmc-mobile/.github/workflows/build-apk.yml`

## Vídeo curto no chat (recurso novo, a pedido)

Só upload de vídeo já existente (galeria), não gravação ao vivo — isso
evita precisar de mais permissões nativas (câmera) além da de microfone
que já foi tratada acima.

- **Backend:** `src/media.js` agora aceita `video/mp4`, `video/webm`,
  `video/quicktime` e `video/3gpp`. Limite geral subiu de 15MB pra 25MB
  (dá folga confortável pro "por volta de 10MB" pedido). Cuidado tomado:
  `video/webm` e `audio/webm` usam extensões internas diferentes pra não
  se confundirem ao servir o arquivo de volta com o `Content-Type` errado
  (testei isso especificamente, dava pra dar errado fácil).
- **App:** novo botão de vídeo ao lado do de foto, no chat privado (DM).
  Sem compressão (diferente de foto, vídeo não dá pra reprocessar fácil
  no navegador) — só valida o tamanho antes de tentar enviar (limite de
  20MB no app, abaixo do teto do backend, pra sobrar margem de erro).

**Arquivos alterados:** `edenmc-backend/src/media.js`,
`edenmc-mobile/src/App.jsx`

**Testes:** validação manual de que `video/webm` não colide com
`audio/webm` ao servir de volta o `Content-Type` certo, mais a bateria
completa (15 suítes) confirmando que nada mais quebrou.

⚠️ A parte de vídeo no app (novo botão, `VideoBubble`) não pôde ser
testada de verdade aqui, mesmo aviso de sempre — só o build real confirma.

---

## Moldura de celular roubando área de toque (achado a partir de um print)

O app inteiro estava dentro de uma "moldura de celular" (380x780px, cantos
arredondados, borda de 6px) — útil pra visualizar o app num navegador de
computador, mas isso estava sendo aplicado **também dentro do app de
verdade**, desenhando uma borda por cima da tela real do aparelho e
roubando área de toque nas bordas (provavelmente a causa dos ícones de
imagem/vídeo "sem resposta" também — vale re-testar depois dessa
correção).

- **App:** a moldura agora só aparece quando o app está rodando num
  navegador comum (`Capacitor.isNativePlatform()` retorna `false`). Dentro
  do app instalado no celular, o conteúdo ocupa a tela inteira, sem borda
  nem cantos arredondados artificiais.

## Cargo de staff no app era só um botão de demonstração

Descoberto ao investigar o item acima: mesmo depois de toda a permissão
de staff real ter sido implementada no backend, o app decidia quais
botões de staff mostrar (ex: "Postar" no Mural) usando um **botão de
demonstração escondido** no canto da tela — nunca consultava se a pessoa
era staff de verdade. Um staff de verdade não veria os próprios botões
sem saber que precisava clicar nesse botão de teste.

- **Backend:** nova rota `GET /app/me`, devolve `{uuid, nick, isStaff}`
  usando o mesmo `db.isStaff()` que já protege as rotas de verdade.
- **App:** busca isso ao entrar e usa pra decidir os botões de staff.
  O botão de demonstração continua existindo, mas só fora do app nativo
  (útil pra testar telas de staff localmente sem precisar de uma conta
  staff de verdade).

**Testes:** `test-staff-permission.js` ampliado com 2 casos novos
verificando que `/app/me` bate com a mesma verdade usada pra proteger as
rotas — bateria completa (15 suítes) passando.

## Gesto de deslizar entre Início e Chat

A pedido: deslizar a tela pra esquerda na Home vai pro Chat, deslizar pra
direita no Chat volta pra Home. Não interfere com outras telas (só ativa
nessas duas), nem com rolagem vertical de listas (o gesto só conta se o
movimento for bem mais horizontal do que vertical).

**Arquivos alterados:** `edenmc-mobile/src/App.jsx`

## Amigo aparecia "offline" mesmo online de verdade

Mesma causa raiz do contador de online zerado (ver o incidente do domínio
acima, mais essa complementação): o status de um amigo só era atualizado
por eventos **ao vivo** de WebSocket durante a sessão atual. Se a pessoa
não gerasse um evento novo (entrar/sair/afk) enquanto seu app estivesse
aberto, ela ficava "offline" pra sempre na tela, mesmo estando online.

- **App:** agora busca `GET /app/players/online` periodicamente (a cada
  30s) e faz uma sincronização completa do status de todo mundo, além dos
  eventos ao vivo continuarem funcionando normalmente por cima disso.

**Arquivos alterados:** `edenmc-mobile/src/App.jsx`

## Contador de online não se recuperava sozinho de uma queda do backend

Confirmado pelo teste que vocês fizeram: sair e entrar de novo no
servidor corrigia o contador, provando a causa — presença só é enviada em
eventos pontuais (entrar, sair, afk, mudar de zona). Se o backend cair um
tempo com gente já online, ninguém "reavisa" que está online quando a
conexão volta, e o contador fica preso em 0 até cada jogador sair e
entrar manualmente.

- **Plugin:** `EdenSocketClient` agora aceita um callback (`onConnected`)
  disparado toda vez que a conexão com o backend é estabelecida — seja a
  primeira vez, seja depois de qualquer queda. `PresenceListener` ganhou
  um método `resyncAll()` que reenvia a presença de todo mundo que está
  online nesse momento; esse método é chamado automaticamente através
  desse callback. Resultado: uma queda do backend agora se autocorrige
  sozinha assim que a conexão volta, sem precisar de ninguém sair e
  entrar manualmente.
- Isso também cobre o caso de um `/reload` do servidor com gente já
  online (mesmo mecanismo, dispara na primeira conexão também).

**Arquivos alterados:** `edenmc-plugin/.../EdenSocketClient.java`,
`edenmc-plugin/.../PresenceListener.java`,
`edenmc-plugin/.../EdenLinkPlugin.java`

⚠️ Igual das outras vezes que mexi no plugin: não consigo compilar aqui
(sem Maven/internet). Revisei a sintaxe com cuidado (inclusive corrigi um
erro meu no meio do caminho — duplicidade de declaração de campo que eu
mesmo introduzi e só percebi ao conferir de novo), mas só o `mvn package`
de vocês confirma que compila de verdade.

---

## Contador mostrava gente online com o servidor desligado

Reportado por vocês: servidor de Minecraft fora do ar, app mostrando "2
online". Causa: a presença só era **atualizada** quando um evento
chegava, nunca **zerada** quando o plugin (fonte da informação) deixava
de estar conectado — o backend simplesmente guardava o último valor
conhecido pra sempre, mesmo sem ninguém confirmando que ainda era verdade.

- **Backend:** quando a conexão do plugin cai (por qualquer motivo —
  servidor desligou, caiu, perdeu rede), o backend agora marca todo mundo
  como offline imediatamente (`db.markAllOffline()`), em vez de manter o
  último estado conhecido indefinidamente.

**Arquivos alterados:** `edenmc-backend/src/db.js`, `edenmc-backend/server.js`

**Testes:** `test-presence-offline.js` (novo). No caminho, achei e
corrigi dois problemas a mais: (1) meu helper de teste WebSocket não
mandava um frame de encerramento de verdade, o que mascarava justamente
esse tipo de bug — corrigido pra simular direito um cliente real
fechando a conexão; (2) usando esse helper corrigido, descobri que o
servidor emitia o evento de desconexão **duas vezes** pra cada queda
(inofensivo hoje por pura sorte de idempotência, mas corrigido). Bateria
completa (16 suítes) passando.

## Chat "fixo" — não dava pra rolar pra ver mensagens antigas

O que parecia um pedido de gesto era na verdade rolagem básica quebrada:
a lista de mensagens crescia pra caber tudo em vez de rolar internamente
com uma altura fixa. Causa: uma pegadinha clássica de CSS flexbox — um
container com `flex-1` não encolhe pra abrir espaço de rolagem a menos
que se diga explicitamente (`min-height: 0`), e essa declaração faltava
em 5 pontos da cadeia de containers entre a tela e a lista de mensagens.

- **App:** adicionado `min-h-0` nos containers necessários. A rolagem
  agora deve funcionar normalmente (arrastar pra cima mostra mensagens
  antigas, pra baixo volta pra atual).

**Arquivos alterados:** `edenmc-mobile/src/App.jsx`

⚠️ Não pude ver isso renderizado de verdade (sem ambiente visual aqui) —
é a explicação mais comum pra esse sintoma exato, e a correção é
tecnicamente correta, mas testem a rolagem depois do build novo.

---

## Chat com cara de app de mensagem de verdade (responder, editar, apagar)

### 1. Botão único de anexo
Dois ícones separados (foto/vídeo) viraram um só ("+") que revela um
menuzinho com as duas opções ao tocar — como em qualquer app de mensagem.

### 2. Responder, editar e apagar mensagens
- **Backend:** cada mensagem já tinha um id, mas era gerado de um jeito
  que colidiria assim que o histórico (limitado a 500 mensagens) começasse
  a cortar as mais antigas — corrigido pra usar um contador de verdade.
  Duas rotas novas: `POST /app/chat/message/:id/edit` (só quem mandou,
  só mensagens de texto) e `.../delete` (quem mandou, ou staff). As
  mudanças chegam em tempo real pra quem já tinha visto a mensagem,
  respeitando as mesmas regras de privacidade por canal já existentes
  (uma edição numa conversa de clã só chega pros membros do clã, etc).
- **Responder:** ao enviar, o app manda o id de qual mensagem está sendo
  respondida; o backend guarda uma "foto" (quem mandou + texto) de como
  ela estava naquele momento, pra continuar fazendo sentido mesmo que a
  original seja editada ou apagada depois.
- **Achado no caminho, corrigido:** quem manda uma mensagem nunca recebia
  ela de volta confirmada pelo servidor (existia só um "eco local" com um
  id falso) — sem um id real, não dava pra editar/apagar a própria
  mensagem. Agora o remetente também recebe a confirmação, e o app troca
  o eco falso pelo real sem duplicar na tela.
- **App:** tocar numa mensagem abre um menuzinho (Responder /
  Editar-se-for-sua / Apagar-se-for-sua-ou-staff). Mensagem respondida
  mostra uma citação por cima; editada mostra "(editado)"; apagada vira
  um balão tracejado "mensagem apagada".

### 3. Duas implementações de chat viraram uma só
A tela de Amigos tinha sua própria versão de chat, duplicada e
separada da usada em clã/aliados/servidor/tell — corrigido, agora usa o
mesmo componente (`ChannelThread`) em todo lugar, o que significa que
responder/editar/apagar/áudio/vídeo funcionam igual em qualquer
conversa, sem ter dado o dobro do trabalho pra manter as duas.

**Arquivos alterados:** `edenmc-backend/src/db.js`,
`edenmc-backend/src/routes/app.js`, `edenmc-backend/server.js`,
`edenmc-backend/src/chatBus.js` (novo), `edenmc-mobile/src/App.jsx`

**Testes:** `test-chat-actions.js` (novo, 12 casos: responder, editar,
apagar, permissões, propagação em tempo real, e a confirmação do
remetente). Bateria completa (17 suítes) passando.

⚠️ A parte visual (`App.jsx`) não pôde ser vista renderizada de verdade
aqui — só o build real confirma que ficou como esperado.

---
