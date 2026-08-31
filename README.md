# EdenMC — app mobile (APK real via Capacitor)

Esse projeto empacota o mesmo `App.jsx` que já construímos (protótipo do
app EdenMC) dentro de um app Android de verdade, usando Capacitor.

**Só tem celular, sem PC?** Pula direto pra seção "Compilar pelo Termux +
GitHub Actions" lá embaixo — é o caminho que não exige instalar Android
SDK no celular.

**Importante**: esse ambiente aqui (onde o Claude roda) não tem Android
SDK nem acesso à internet, então não dá pra compilar o `.apk` por aqui —
os passos abaixo precisam ser rodados na sua máquina (com Node.js e
Android Studio instalados).

## 1. Configurar a URL do backend

Antes de tudo, copie `.env.example` pra `.env` e coloque a URL **pública**
do backend (a mesma que você configurou como `BACKEND_PUBLIC_URL` no
Mercado Pago, se já chegou até essa parte):

```
cp .env.example .env
```

```
VITE_API_BASE_URL=https://seu-backend.exemplo.com
```

**Precisa ser `https://`**. Android bloqueia chamadas para `http://` por
padrão (Cleartext Traffic) a partir da API 28 — se o backend só tiver
`http://` por enquanto, ou usa um proxy reverso com certificado (Caddy,
Nginx + Let's Encrypt, Cloudflare Tunnel) ou vai precisar liberar
cleartext manualmente no `AndroidManifest.xml` depois do passo 3 (não
recomendado pra produção).

## 2. Instalar dependências e buildar o web app

```
npm install
npm run build
```

Isso gera a pasta `dist/` — é o app web "compilado", que o Capacitor vai
empacotar dentro do Android.

## 3. Adicionar a plataforma Android (só na primeira vez)

```
npx cap add android
npx cap sync android
```

Isso cria a pasta `android/` — um projeto Android/Gradle completo.

## 4. Permissão de microfone (chat de áudio)

O app grava áudio de verdade (`MediaRecorder`/`getUserMedia`). Depois do
`cap add android`, abra `android/app/src/main/AndroidManifest.xml` e
confirme que tem essas linhas (o Capacitor geralmente já adiciona
`INTERNET` sozinho, mas `RECORD_AUDIO` costuma precisar ser manual):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## 5. Gerar o APK

**Opção A — Android Studio (mais simples):**

```
npx cap open android
```

Abre o projeto no Android Studio. Menu **Build → Build Bundle(s) / APK(s)
→ Build APK(s)**. O `.apk` sai em
`android/app/build/outputs/apk/debug/app-debug.apk`.

**Opção B — linha de comando:**

```
cd android
./gradlew assembleDebug
```

Mesmo caminho de saída: `android/app/build/outputs/apk/debug/app-debug.apk`.

Esse `.apk` de debug já dá pra instalar direto no celular (ativando
"Instalar de fontes desconhecidas") ou postar num link pra download. Pra
publicar na Play Store, é preciso gerar uma versão **release**, assinada
com uma keystore própria — outro passo, quando chegar a hora.

## 6. Toda vez que mudar o código do app

```
npm run build
npx cap sync android
```

E gera o APK de novo (passo 5). O `npx cap sync` copia o novo `dist/` pra
dentro do projeto Android — sem isso, o Android continua com a versão
antiga.

## Compilar pelo Termux + GitHub Actions (sem PC, sem SDK no celular)

Instalar Android SDK direto no Termux funciona, mas é pesado (~1-2GB de
download, configuração manual de `ANDROID_HOME`, e o build pode esbarrar
na RAM/storage do celular). O caminho mais tranquilo pra quem só tem
celular é deixar o **GitHub Actions compilar na nuvem** — o Termux só
manda o código pro GitHub, o build roda nos servidores deles, e você baixa
o `.apk` pronto.

Esse projeto já vem com o workflow pronto em
`.github/workflows/build-apk.yml`. Passo a passo:

**1. No Termux, instale git e crie um repositório:**

```
pkg install git
cd edenmc-mobile
git init
git add .
git commit -m "primeiro commit"
```

**2. Crie um repositório vazio no GitHub** (pelo navegador do celular
mesmo, github.com/new — pode ser privado) e conecte:

```
git remote add origin https://github.com/SEU-USUARIO/edenmc-mobile.git
git branch -M main
git push -u origin main
```

Vai pedir login — usar um Personal Access Token no lugar da senha
(GitHub não aceita mais senha normal por git). Gera em
github.com/settings/tokens.

**3. Configurar a URL do backend como variável do repositório** (não
precisa ir pro `.env` local, o workflow usa isso direto):

No GitHub: **Settings → Secrets and variables → Actions → Variables →
New repository variable**, nome `VITE_API_BASE_URL`, valor a URL pública
do backend (`https://...`).

**4. Disparar o build:**

O workflow já roda sozinho a cada `git push` na branch `main`. Pra
disparar manualmente (sem precisar commitar nada novo): aba **Actions** no
GitHub → **Build APK** → **Run workflow**.

**5. Baixar o APK:**

Quando o workflow terminar (ícone verde), entra nele → na parte de baixo,
em **Artifacts**, tem `edenmc-debug-apk` — baixa e é o `.apk` pronto pra
instalar. Isso tudo dá pra fazer pelo navegador do celular, sem precisar
de PC em nenhum momento.

## Onde postar pra download

Um `.apk` de debug (sem passar pela Play Store) pode ser hospedado em
qualquer lugar que sirva arquivo estático — um link direto (Google Drive,
S3, o próprio backend servindo `/downloads/edenmc.apk`) funciona. O
jogador baixa e instala manualmente, precisando permitir "fontes
desconhecidas" no Android. Pra evitar esse aviso e facilitar instalação em
massa, o caminho correto no médio prazo é a Play Store (exige conta de
desenvolvedor Google, build assinada em modo release, e passar pela
revisão deles).

