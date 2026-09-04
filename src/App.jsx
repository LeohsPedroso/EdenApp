import React, { useState, useRef, useEffect } from "react";
import {
  Home,
  Users,
  UserPlus,
  ShoppingBag,
  Megaphone,
  Plus,
  Send,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Shield,
  Circle,
  Sparkles,
  Coins,
  Pickaxe,
  Gem,
  Crown,
  Swords,
  Check,
  Gavel,
  Store,
  Globe,
  Lock,
  Ban,
  Tag,
  Clock,
  MessageSquare,
  Handshake,
  AtSign,
  Lightbulb,
  ArrowBigUp,
  Settings,
  Gamepad2,
  Smartphone,
  Play,
  Pause,
  Mic,
  Square,
  Trophy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// bg      #0F1712  (mata escura à noite)
// surface #16211A
// card    #1C2A20
// line    #2A3B2E
// accent  #5FBE79  (musgo / grama)
// ember   #E8A33D  (tocha)
// text    #E7E9E2
// muted   #8FA093
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Conexão com o backend real (ver edenmc-backend/server.js)
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

async function apiFetch(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `erro ${response.status}`);
  }
  return data;
}

// O JWT não é criptografado, só assinado — dá pra ler o payload (uuid, nick)
// direto no cliente sem validar a assinatura. Só pra saber "quem sou eu"
// nas telas; a validação de verdade sempre acontece no backend.
function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

// Cada "sala" de chat vira uma chave única no store de mensagens do App.
// channel vem do backend; scopeId e senderUuid decidem qual sala exata —
// Tell/DM precisam saber quem é "o outro lado" tanto ao enviar (scopeId =
// alvo) quanto ao receber (senderUuid = quem mandou, se não fui eu).
function roomKeyFor(channel, scopeId, senderUuid, myUuid) {
  switch (channel) {
    case "tell": {
      const partner = senderUuid === myUuid ? scopeId : senderUuid;
      return `dm-tell:${partner}`;
    }
    case "app-dm": {
      const partner = senderUuid === myUuid ? scopeId : senderUuid;
      return `dm-app:${partner}`;
    }
    case "cla":
      return "servidor:cla";
    case "aliados":
      return "servidor:aliados";
    case "global":
      return "servidor:global";
    case "app-cla":
      return "app:cla";
    case "app-aliados":
      return "app:aliados";
    default:
      return channel;
  }
}

// Áudio não vira um tipo novo no backend — ele já entende "channel/scopeId/
// text" pra tudo, então o áudio viaja como texto convencionado
// "AUDIO::<url>::<duração>". Isso funciona tanto pro eco otimista local
// quanto pra mensagem recebida pelo WebSocket, sem mudar nada no schema.
function parseChatText(rawText) {
  if (typeof rawText === "string" && rawText.startsWith("AUDIO::")) {
    const [, url, duration] = rawText.split("::");
    return { audio: true, audioUrl: url, duration: duration || "0:00" };
  }
  if (typeof rawText === "string" && rawText.startsWith("IMAGE::")) {
    const url = rawText.slice("IMAGE::".length);
    return { media: true, mediaUrl: url };
  }
  return { text: rawText };
}


// Ícones da Loja Online são só visuais — o catálogo (nome, preço) vem do
// backend (GET /app/store/catalog), aqui só mapeamos sku -> ícone.
const ONLINE_ICONS = {
  cash_1000: Coins,
  protection_block: Lock,
  vip_guardiao: Shield,
  vip_lenda: Crown,
  unban: Ban,
};

// Skull isn't in the default import list above on purpose-check; fallback icon
function Skull(props) {
  return <Circle {...props} />;
}

function PhoneChrome({ children }) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0F1712] text-[#E7E9E2] overflow-hidden">
      {children}
    </div>
  );
}

function TopStatus({ nick, role, onOpenConfig, onOpenProfile, authToken }) {
  const [onlineCount, setOnlineCount] = useState(null);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    const fetchCount = () => {
      apiFetch("/app/players/online", { token: authToken })
        .then((data) => {
          if (!cancelled) setOnlineCount((data.players || []).length);
        })
        .catch(() => {
          // silencioso -- mantem o ultimo valor conhecido em vez de piscar
          // um erro toda vez que a rede oscila
        });
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // atualiza a cada 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authToken]);

  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2A3B2E]">
      <button onClick={onOpenProfile} className="text-left">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8FA093]">EdenMC</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-[#E7E9E2]">{nick}</p>
          {role && (
            <span className="flex items-center gap-1 bg-[#E8A33D]/15 border border-[#E8A33D]/40 rounded-full px-2 py-0.5">
              <Shield size={10} className="text-[#E8A33D]" />
              <span className="text-[9px] font-bold text-[#E8A33D] tracking-wide">
                {role.toUpperCase()}
              </span>
            </span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#16211A] border border-[#2A3B2E] rounded-full px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5FBE79] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5FBE79]" />
          </span>
          <span className="text-xs font-medium text-[#C9D3CB]">{onlineCount === null ? "…" : onlineCount} online</span>
        </div>
        <button
          onClick={onOpenConfig}
          className="w-8 h-8 rounded-full bg-[#16211A] border border-[#2A3B2E] flex items-center justify-center shrink-0"
        >
          <Settings size={15} className="text-[#8FA093]" />
        </button>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, chatSpace }) {
  const items = [
    { id: "home", label: "Início", icon: Home },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "loja", label: "Loja", icon: ShoppingBag },
    { id: "atualizacoes", label: "Feed", icon: Megaphone },
  ];
  return (
    <div className="border-t border-[#2A3B2E] bg-[#0F1712] px-2 pt-2 pb-4">
      <div className="flex items-center justify-between">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          const color = it.id === "chat" ? (chatSpace === "app" ? "#7CAAD6" : "#5FBE79") : "#5FBE79";
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl border transition-colors"
              style={{
                borderColor: active ? color : "transparent",
                backgroundColor: active ? `${color}14` : "transparent",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} style={{ color: active ? color : "#647065" }} />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? color : "#647065" }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------- Vincular (login) ------------------------------

function LinkScreen({ onLinked }) {
  const [mode, setMode] = useState("vincular"); // vincular | login | recuperar
  const [step, setStep] = useState(1); // 1: instrução, 2: código, 3: criar/redefinir senha, 4: sucesso
  const [resetMode, setResetMode] = useState(false);
  const [code, setCode] = useState("");
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [loginId, setLoginId] = useState(""); // nick OU email, no login
  const [loginSenha, setLoginSenha] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const digits = code.replace(/\D/g, "").slice(0, 6);

  const confirmCode = () => {
    if (digits.length !== 6) {
      setError("Digite o código de 6 dígitos gerado no jogo.");
      return;
    }
    // o código só é validado de verdade no backend, junto com a senha —
    // aqui só avança pro próximo passo do formulário
    setError("");
    setStep(3);
  };

  const createLogin = async () => {
    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== senha2) {
      setError("As senhas não coincidem.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("E-mail inválido (ou deixe em branco).");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const data = await apiFetch("/app/link/confirm", {
        method: "POST",
        body: { code: digits, password: senha, email: email.trim() || undefined },
      });
      setNick(data.nick);
      setToken(data.token);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const doLogin = async () => {
    if (!loginId.trim() || !loginSenha.trim()) {
      setError("Preencha nick/e-mail e senha.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const data = await apiFetch("/app/auth/login", {
        method: "POST",
        body: { identifier: loginId.trim(), password: loginSenha },
      });
      onLinked(data.nick, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "login") {
    return (
      <div className="flex-1 flex flex-col justify-between px-6 pt-10 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E7E9E2] leading-tight">Entrar</h1>
          <p className="text-sm text-[#B7C1B8] mt-2 leading-relaxed">
            Use o nick ou e-mail e a senha criados quando você vinculou a conta.
          </p>
          <div className="mt-6 space-y-3">
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Nick ou e-mail"
              className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#5FBE79] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
            />
            <input
              value={loginSenha}
              onChange={(e) => setLoginSenha(e.target.value)}
              type="password"
              placeholder="Senha"
              className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#5FBE79] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
            />
            {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
            <button
              onClick={doLogin}
              disabled={submitting}
              className="w-full mt-2 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>
            <button
              onClick={() => {
                setMode("recuperar");
                setError("");
              }}
              className="w-full text-center text-xs text-[#8FA093] py-1"
            >
              esqueci minha senha
            </button>
            <button
              onClick={() => {
                setMode("vincular");
                setStep(1);
                setError("");
              }}
              className="w-full flex items-center justify-center gap-1 text-xs text-[#8FA093] py-2"
            >
              <ChevronLeft size={14} /> ainda não tenho conta
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-[#4A574E]">EdenPlugins · EdenMC</p>
      </div>
    );
  }

  if (mode === "recuperar") {
    return (
      <div className="flex-1 flex flex-col justify-between px-6 pt-10 pb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#E8A33D] mb-1">
            Recuperar senha
          </p>
          <h1 className="text-2xl font-bold text-[#E7E9E2] leading-tight">
            Gerar nova senha
          </h1>

          {step < 3 && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-[#B7C1B8] leading-relaxed">
                Entre no servidor EdenMC e digite no chat:
              </p>
              <div className="bg-[#16211A] border border-[#2A3B2E] rounded-xl px-4 py-3 font-mono text-[#E8A33D] text-sm">
                /vincular
              </div>
              <p className="text-sm text-[#B7C1B8] leading-relaxed">
                Isso gera um novo código de 6 dígitos, só pra confirmar que é
                você mesmo. Cole o código abaixo.
              </p>
              <input
                value={digits}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                className="w-full text-center tracking-[0.4em] text-2xl font-mono bg-[#16211A] border border-[#2A3B2E] focus:border-[#E8A33D] outline-none rounded-xl py-4 text-[#E7E9E2] placeholder:text-[#3A4A3E]"
              />
              {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
              <button
                onClick={confirmCode}
                className="w-full mt-2 bg-[#E8A33D] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform"
              >
                Confirmar código
              </button>
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="w-full flex items-center justify-center gap-1 text-xs text-[#8FA093] py-2"
              >
                <ChevronLeft size={14} /> voltar pro login
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-4">
              <div className="bg-[#16211A] border border-[#2A3B2E] rounded-xl px-4 py-3 flex items-center gap-2">
                <Check size={14} className="text-[#E8A33D]" />
                <p className="text-sm text-[#E7E9E2]">Código de 6 dígitos preenchido</p>
              </div>
              <p className="text-sm text-[#B7C1B8] leading-relaxed">
                Crie a nova senha dessa conta. O código é validado ao salvar.
              </p>
              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                type="password"
                placeholder="Nova senha"
                className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#E8A33D] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
              />
              <input
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                type="password"
                placeholder="Confirmar nova senha"
                className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#E8A33D] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
              />
              {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
              <button
                onClick={createLogin}
                disabled={submitting}
                className="w-full mt-2 bg-[#E8A33D] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {submitting ? "Salvando..." : "Salvar nova senha"}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="mt-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8A33D]/15 border border-[#E8A33D]/40 flex items-center justify-center mb-4">
                <Check size={28} className="text-[#E8A33D]" />
              </div>
              <p className="text-sm text-[#B7C1B8]">Senha atualizada pra</p>
              <p className="text-xl font-bold text-[#E7E9E2] mt-1">{nick}</p>
              <button
                onClick={() => onLinked(nick, token)}
                className="w-full mt-8 bg-[#E8A33D] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform"
              >
                Entrar no app
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-[#4A574E]">EdenPlugins · EdenMC</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pt-10 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#5FBE79] mb-1">
          Passo {Math.min(step, 3)} de 3
        </p>
        <h1 className="text-2xl font-bold text-[#E7E9E2] leading-tight">
          Vincular conta
        </h1>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-[#B7C1B8] leading-relaxed">
              Entre no servidor EdenMC e digite no chat:
            </p>
            <div className="bg-[#16211A] border border-[#2A3B2E] rounded-xl px-4 py-3 font-mono text-[#5FBE79] text-sm">
              /vincular
            </div>
            <p className="text-sm text-[#B7C1B8] leading-relaxed">
              O jogo vai gerar um código de 6 dígitos no chat. Volte aqui e
              cole o código no próximo passo.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              Já tenho meu código
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="w-full text-center text-xs text-[#8FA093] py-2"
            >
              já tenho conta, entrar com nick e senha
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-[#B7C1B8]">
              Cole abaixo o código gerado dentro do jogo.
            </p>
            <input
              value={digits}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
              className="w-full text-center tracking-[0.4em] text-2xl font-mono bg-[#16211A] border border-[#2A3B2E] focus:border-[#5FBE79] outline-none rounded-xl py-4 text-[#E7E9E2] placeholder:text-[#3A4A3E]"
            />
            {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
            <p className="text-xs text-[#647065] leading-relaxed">
              O login usa exatamente o nick do jogo vinculado ao código — se
              os nicks não forem idênticos, a vinculação não é concluída.
            </p>
            <button
              onClick={confirmCode}
              className="w-full mt-2 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform"
            >
              Confirmar código
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-1 text-xs text-[#8FA093] py-2"
            >
              <ChevronLeft size={14} /> voltar
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <div className="bg-[#16211A] border border-[#2A3B2E] rounded-xl px-4 py-3 flex items-center gap-2">
              <Check size={14} className="text-[#5FBE79]" />
              <p className="text-sm text-[#E7E9E2]">Código de 6 dígitos preenchido</p>
            </div>
            <p className="text-sm text-[#B7C1B8] leading-relaxed">
              Crie uma senha pra essa conta. O código é validado ao salvar —
              assim, da próxima vez você entra direto com nick e senha, sem
              gerar outro código.
            </p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="E-mail (opcional, alternativa pra entrar)"
              className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#5FBE79] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
            />
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type="password"
              placeholder="Criar senha"
              className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#5FBE79] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
            />
            <input
              value={senha2}
              onChange={(e) => setSenha2(e.target.value)}
              type="password"
              placeholder="Confirmar senha"
              className="w-full bg-[#16211A] border border-[#2A3B2E] focus:border-[#5FBE79] outline-none rounded-xl px-4 py-3 text-[#E7E9E2] placeholder:text-[#4A574E] text-sm"
            />
            {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
            <button
              onClick={createLogin}
              disabled={submitting}
              className="w-full mt-2 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {submitting ? "Criando..." : "Criar login"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#5FBE79]/15 border border-[#5FBE79]/40 flex items-center justify-center mb-4">
              <Check size={28} className="text-[#5FBE79]" />
            </div>
            <p className="text-sm text-[#B7C1B8]">Conta vinculada e login criado como</p>
            <p className="text-xl font-bold text-[#E7E9E2] mt-1">{nick}</p>
            <p className="text-xs text-[#647065] mt-3 leading-relaxed px-4">
              Da próxima vez que sair do app, é só entrar de novo com esse nick
              e a senha que você criou — sem precisar de outro código.
            </p>
            <button
              onClick={() => onLinked(nick, token)}
              className="w-full mt-8 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform"
            >
              Entrar no app
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-[#4A574E]">EdenPlugins · EdenMC</p>
    </div>
  );
}

// ---------------------------------- Início -----------------------------------

function HomeScreen({ nick, setTab, authToken }) {
  const [latestPost, setLatestPost] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);

  useEffect(() => {
    if (!authToken) return;
    apiFetch("/app/feed/list", { token: authToken })
      .then((data) => setLatestPost((data.posts || [])[0] || null))
      .catch(() => setLatestPost(null));
    apiFetch("/app/players/online", { token: authToken })
      .then((data) => setOnlineCount((data.players || []).length))
      .catch(() => setOnlineCount(null));
  }, [authToken]);

  const shortcuts = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "amigos", label: "Amigos", icon: UserPlus },
    { id: "loja", label: "Loja", icon: ShoppingBag },
    { id: "atualizacoes", label: "Feed", icon: Megaphone },
  ];
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
      <div className="bg-[#16211A] border border-[#2A3B2E] rounded-2xl p-5">
        <p className="text-xs text-[#8FA093]">Bem-vindo de volta,</p>
        <p className="text-lg font-bold text-[#E7E9E2]">{nick}</p>
        <div className="mt-4 flex items-center gap-2 text-[#5FBE79] text-sm font-medium">
          <Circle size={8} className="fill-[#5FBE79]" />
          {onlineCount === null ? "…" : onlineCount} jogadores online agora
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-3">
          Acesso rápido
        </p>
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex flex-col items-start gap-3 active:scale-[0.97] transition-transform"
              >
                <Icon size={18} className="text-[#5FBE79]" />
                <span className="text-sm font-medium text-[#E7E9E2]">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-3">
          Última atualização
        </p>
        <div className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4">
          {latestPost ? (
            <>
              <p className="text-sm font-semibold text-[#E7E9E2]">{latestPost.title}</p>
              <p className="text-xs text-[#8FA093] mt-1 leading-relaxed">{latestPost.body}</p>
            </>
          ) : (
            <p className="text-xs text-[#647065]">Nenhuma atualização ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------- Chat --------------------------------------

function SourceTag({ source }) {
  const isGame = source === "game";
  const Icon = isGame ? Gamepad2 : Smartphone;
  const color = isGame ? "#5FBE79" : "#7CAAD6";
  return (
    <span className="flex items-center gap-1">
      <Icon size={10} style={{ color }} />
      <span className="text-[9px]" style={{ color }}>
        {isGame ? "no jogo" : "pelo app"}
      </span>
    </span>
  );
}

function AudioBubble({ url, me, duration }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  return (
    <div className="flex items-center gap-2 py-0.5 min-w-[140px]">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: me ? "rgba(15,23,18,0.15)" : "#2A3B2E" }}
      >
        {playing ? (
          <Pause size={12} className={me ? "text-[#0F1712]" : "text-[#E7E9E2]"} fill="currentColor" />
        ) : (
          <Play size={12} className={me ? "text-[#0F1712]" : "text-[#E7E9E2]"} fill="currentColor" />
        )}
      </button>
      <div className="flex items-end gap-0.5 flex-1">
        {[3, 6, 4, 8, 5, 7, 3, 6, 4].map((h, i) => (
          <span
            key={i}
            className="w-0.5 rounded-full"
            style={{
              height: `${h * 2}px`,
              backgroundColor: me ? "rgba(15,23,18,0.4)" : "#4A574E",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] shrink-0" style={{ opacity: 0.8 }}>
        {duration || "0:00"}
      </span>
    </div>
  );
}

function AudioRecordButton({ onRecorded }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  // Guarda o tempo em uma ref, nao so no state: o callback "onstop" do
  // MediaRecorder e definido uma unica vez, dentro de start(), e fica preso
  // ao valor de "seconds" QUE EXISTIA NAQUELE MOMENTO (0, antes do timer
  // rodar) -- nunca ve as atualizacoes do state depois disso. A UI (que le
  // "seconds" direto no render) conta certinho na tela, mas sem essa ref o
  // audio sempre seria salvo com duracao "0:00", nunca a duracao real.
  const secondsRef = useRef(0);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = String(reader.result).split(",")[1];
          onRecorded(base64, mimeType, secondsRef.current);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch (err) {
      setError("Sem acesso ao microfone");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  if (error) {
    return (
      <button
        onClick={start}
        className="w-9 h-9 rounded-full bg-[#16211A] border border-[#E8A33D]/40 flex items-center justify-center shrink-0"
        title={error}
      >
        <Mic size={15} className="text-[#E8A33D]" />
      </button>
    );
  }

  if (recording) {
    return (
      <button
        onClick={stop}
        className="h-9 rounded-full bg-[#C96A5A] flex items-center gap-1.5 px-3 shrink-0"
      >
        <Square size={12} className="text-white" fill="currentColor" />
        <span className="text-[11px] font-semibold text-white">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={start}
      className="w-9 h-9 rounded-full bg-[#16211A] border border-[#2A3B2E] flex items-center justify-center shrink-0"
    >
      <Mic size={15} className="text-[#8FA093]" />
    </button>
  );
}

function ImageBubble({ url }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button onClick={() => setExpanded(true)} className="block">
        <img
          src={url}
          alt="imagem enviada no chat"
          className="max-w-[200px] max-h-[200px] rounded-lg border border-[#2A3B2E] object-cover"
        />
      </button>
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
        >
          <img src={url} alt="imagem enviada no chat" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}

// Fotos de celular moderno passam de 15MB com facilidade (o limite que o
// backend impoe) -- sem isso, o usuario escolhia a foto, esperava o
// upload rodar (as vezes em dados moveis), e so entao recebia um erro
// generico de "arquivo grande demais". Reduz a imagem ANTES de subir:
// evita o erro quase sempre, e economiza dados moveis de quem esta
// mandando. GIFs sao passados direto (comprimir via canvas perderia a
// animacao).
function compressImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (file.type === "image/gif") {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ base64: String(reader.result).split(",")[1], mimetype: file.type });
      reader.onerror = () => reject(new Error("falha ao ler o arquivo"));
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ base64: dataUrl.split(",")[1], mimetype: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("falha ao processar a imagem"));
    };
    img.src = objectUrl;
  });
}

function ImagePickerButton({ onPicked }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem");
      return;
    }
    setError("");
    compressImage(file)
      .then(({ base64, mimetype }) => onPicked(base64, mimetype))
      .catch(() => setError("Não foi possível processar a imagem"));
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        title={error}
        className="w-9 h-9 rounded-full bg-[#16211A] border border-[#2A3B2E] flex items-center justify-center shrink-0"
      >
        <ImageIcon size={15} className={error ? "text-[#E8A33D]" : "text-[#8FA093]"} />
      </button>
    </>
  );
}

function ChannelThread({
  messages,
  onSend,
  onSendAudio,
  onSendImage,
  placeholder,
  accent = "#5FBE79",
  allowAudio = false,
  allowMedia = false,
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="flex-1 flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.me ? "items-end" : "items-start"}`}>
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {!m.me && (
                <span className="text-[10px] font-semibold" style={{ color: accent }}>
                  {m.from}
                </span>
              )}
              {m.source && <SourceTag source={m.source} />}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                m.me
                  ? "text-[#0F1712] rounded-br-sm"
                  : "bg-[#1C2A20] border border-[#2A3B2E] text-[#E7E9E2] rounded-bl-sm"
              }`}
              style={m.me ? { backgroundColor: accent } : {}}
            >
              {m.audio ? (
                <AudioBubble url={m.audioUrl} me={m.me} duration={m.duration} />
              ) : m.media ? (
                <ImageBubble url={m.mediaUrl} />
              ) : (
                <p className="text-sm leading-snug">{m.text}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-[#2A3B2E] flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={placeholder}
          className="flex-1 bg-[#16211A] border border-[#2A3B2E] rounded-full px-4 py-2.5 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none"
          style={{ borderColor: undefined }}
        />
        {allowMedia && !draft && <ImagePickerButton onPicked={(base64, mimetype) => onSendImage(base64, mimetype)} />}
        {allowAudio && !draft && (
          <AudioRecordButton onRecorded={(base64, mimetype, seconds) => onSendAudio(base64, mimetype, seconds)} />
        )}
        <button
          onClick={send}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: accent }}
        >
          <Send size={15} className="text-[#0F1712]" />
        </button>
      </div>
    </div>
  );
}

function ChatScreen({ space, setSpace, rooms, sendChat, sendAudio, sendImage, myUuid, nick, authToken, presence, friendsList }) {
  const [gameMode, setGameMode] = useState(null); // null | "survival"
  const [channel, setChannel] = useState("cla"); // cla | aliados | global | tell
  const [myClan, setMyClan] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const [clanList, setClanList] = useState([]);
  const [tellTarget, setTellTarget] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [appChannel, setAppChannel] = useState("geral"); // geral | cla | aliados | amigos
  const [appFriendTarget, setAppFriendTarget] = useState(null);

  // Clã real: busca quem eu sou assim que a tela monta, e a lista de clãs
  // disponíveis sempre que a gente for mostrar a tela de "sem clã".
  const refreshMyClan = async () => {
    try {
      const data = await apiFetch("/app/clan/me", { token: authToken });
      setMyClan(data.clan);
    } catch {
      // sem conexão com o backend ainda — mantém como null
    }
  };
  const refreshClanList = async () => {
    try {
      const data = await apiFetch("/app/clan/list", { token: authToken });
      setClanList(data.clans || []);
    } catch {
      setClanList([]);
    }
  };
  const refreshOnlinePlayers = async () => {
    try {
      const data = await apiFetch("/app/players/online", { token: authToken });
      setOnlinePlayers((data.players || []).filter((p) => p.uuid !== myUuid));
    } catch {
      setOnlinePlayers([]);
    }
  };

  useEffect(() => {
    if (!authToken) return;
    refreshMyClan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (!authToken || myClan) return;
    refreshClanList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, myClan, channel, appChannel]);

  useEffect(() => {
    if (!authToken || channel !== "tell" || tellTarget) return;
    refreshOnlinePlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, channel, tellTarget]);

  const joinClan = async (clanId) => {
    try {
      await apiFetch(`/app/clan/join`, { method: "POST", body: { clanId }, token: authToken });
      await refreshMyClan();
    } catch (err) {
      alert(err.message);
    }
  };

  const createClan = async (name, tag) => {
    try {
      await apiFetch("/app/clan/create", { method: "POST", body: { name, tag }, token: authToken });
      await refreshMyClan();
    } catch (err) {
      alert(err.message);
    }
  };

  const leaveClan = async () => {
    try {
      await apiFetch("/app/clan/leave", { method: "POST", token: authToken });
      setMyClan(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const appChannels = [
    { id: "geral", label: "Geral", icon: Smartphone },
    { id: "cla", label: "Clã", icon: Users },
    { id: "aliados", label: "Aliados", icon: Handshake },
    { id: "amigos", label: "Amigos", icon: UserPlus },
  ];

  const channels = [
    { id: "cla", label: "Clã", icon: Users },
    { id: "aliados", label: "Aliados", icon: Handshake },
    { id: "global", label: "Global", icon: Globe },
    { id: "tell", label: "Tell", icon: AtSign },
  ];

  const claMsgs = rooms["servidor:cla"] || [];
  const alliesMsgs = rooms["servidor:aliados"] || [];
  const globalMsgs = rooms["servidor:global"] || [];
  const clanAppMsgs = rooms["app:cla"] || [];
  const alliesAppMsgs = rooms["app:aliados"] || [];

  if (showManage && myClan) {
    return (
      <ClanManageScreen
        myClan={myClan}
        authToken={authToken}
        onBack={() => setShowManage(false)}
        onChanged={refreshMyClan}
        clanList={clanList}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <button
          onClick={() => setSpace("servidor")}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-2.5 border transition-colors"
          style={{
            backgroundColor: space === "servidor" ? "#5FBE7914" : "#16211A",
            color: space === "servidor" ? "#5FBE79" : "#8FA093",
            borderColor: space === "servidor" ? "#5FBE79" : "#2A3B2E",
          }}
        >
          <Gamepad2 size={14} /> Servidor
        </button>
        <button
          onClick={() => setSpace("app")}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-2.5 border transition-colors"
          style={{
            backgroundColor: space === "app" ? "#7CAAD614" : "#16211A",
            color: space === "app" ? "#7CAAD6" : "#8FA093",
            borderColor: space === "app" ? "#7CAAD6" : "#2A3B2E",
          }}
        >
          <Smartphone size={14} /> App
        </button>
      </div>

      {space === "servidor" && (
        <p className="px-5 pb-2 text-[10px] text-[#647065] leading-relaxed">
          Mensagens aqui chegam pra quem está online no servidor agora.
        </p>
      )}
      {space === "app" && (
        <p className="px-5 pb-2 text-[10px] text-[#647065] leading-relaxed">
          Conversa fica só no app — não aparece pra quem tá jogando.
        </p>
      )}

      {space === "servidor" && !gameMode && (
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2.5">
          <p className="text-xs text-[#8FA093] mb-1">Escolha o modo de jogo.</p>
          <button
            onClick={() => setGameMode("survival")}
            className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5FBE79]/15 flex items-center justify-center">
                <Gamepad2 size={16} className="text-[#5FBE79]" />
              </div>
              <p className="text-sm font-semibold text-[#E7E9E2]">Survival</p>
            </div>
            <ChevronRight size={16} className="text-[#4A574E]" />
          </button>
          {["Skyblock", "Factions", "Prison"].map((name) => (
            <div
              key={name}
              className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-xl p-4 flex items-center justify-between opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2A3B2E] flex items-center justify-center">
                  <Lock size={14} className="text-[#647065]" />
                </div>
                <p className="text-sm font-medium text-[#8FA093]">{name}</p>
              </div>
              <span className="text-[10px] font-semibold text-[#647065] bg-[#0F1712] border border-[#2A3B2E] rounded-full px-2.5 py-1">
                Em breve
              </span>
            </div>
          ))}
        </div>
      )}

      {space === "servidor" && gameMode === "survival" && (
        <>
          <div className="px-5 py-2 flex items-center gap-2 bg-[#12190F]">
            <button onClick={() => setGameMode(null)} className="text-[#8FA093]">
              <ChevronLeft size={16} />
            </button>
            <p className="text-xs font-bold text-[#E7E9E2]">Survival</p>
          </div>
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto border-b border-[#2A3B2E]">
            {channels.map((c) => {
              const Icon = c.icon;
              const active = channel === c.id;
              const locked = (c.id === "cla" || c.id === "aliados") && !myClan;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setChannel(c.id);
                    if (c.id === "tell") setTellTarget(null);
                  }}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-2 border transition-colors"
                  style={{
                    backgroundColor: active ? "#5FBE7914" : "#16211A",
                    color: active ? "#5FBE79" : "#8FA093",
                    borderColor: active ? "#5FBE79" : "#2A3B2E",
                  }}
                >
                  <Icon size={13} />
                  {c.label}
                  {locked && (
                    <Lock size={10} style={{ color: active ? "#5FBE79" : "#4A574E" }} />
                  )}
                </button>
              );
            })}
          </div>

          {channel === "cla" && !myClan && (
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#E7E9E2]">Clãs disponíveis</h2>
                <p className="text-xs text-[#8FA093] mt-1">
                  Você ainda não faz parte de um clã. Entre em um existente ou crie o seu.
                </p>
              </div>
              <div className="space-y-3">
                {clanList.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#5FBE79]/15 border border-[#5FBE79]/30 flex items-center justify-center text-[#5FBE79] text-xs font-bold">
                        {c.tag}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#E7E9E2]">{c.name}</p>
                        <p className="text-xs text-[#647065]">{c.members} membros</p>
                      </div>
                    </div>
                    <button
                      onClick={() => joinClan(c.id)}
                      className="text-xs font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-2 active:scale-[0.96] transition-transform"
                    >
                      Entrar
                    </button>
                  </div>
                ))}
                {clanList.length === 0 && (
                  <p className="text-xs text-[#4A574E]">Nenhum clã criado ainda.</p>
                )}
              </div>
              <CreateClanForm onCreate={createClan} />
            </div>
          )}

          {channel === "cla" && myClan && (
            <>
              <div className="px-5 py-2.5 flex items-center justify-between bg-[#12190F]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[#E7E9E2]">{myClan.name}</p>
                    {myClan.myRole === "lider" && (
                      <span className="text-[8px] font-bold text-[#E8A33D] bg-[#E8A33D]/15 border border-[#E8A33D]/40 rounded-full px-1.5 py-0.5">
                        LÍDER
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#647065]">{myClan.members} membros</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowManage(true)}
                    className="text-[10px] text-[#5FBE79] underline underline-offset-2"
                  >
                    gerenciar
                  </button>
                  <button
                    onClick={leaveClan}
                    className="text-[10px] text-[#8FA093] underline underline-offset-2"
                  >
                    sair do clã
                  </button>
                </div>
              </div>
              <ChannelThread
                messages={claMsgs}
                onSend={(text) => sendChat("cla", null, text)}
                placeholder="Mensagem para o clã..."
                accent="#5FBE79"
              />
            </>
          )}

          {channel === "aliados" && !myClan && (
            <div className="flex-1 flex items-center justify-center px-8 text-center">
              <p className="text-sm text-[#647065]">
                Entre em um clã pra ver o chat com os clãs aliados.
              </p>
            </div>
          )}

          {channel === "aliados" && myClan && (
            <ChannelThread
              messages={alliesMsgs}
              onSend={(text) => sendChat("aliados", null, text)}
              placeholder="Mensagem para os aliados..."
              accent="#7CD6A0"
            />
          )}

          {channel === "global" && (
            <ChannelThread
              messages={globalMsgs}
              onSend={(text) => sendChat("global", null, text)}
              placeholder="Mensagem para o servidor..."
              accent="#E8A33D"
            />
          )}

          {channel === "tell" && !tellTarget && (
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
              <p className="text-xs text-[#8FA093]">Jogadores online agora — escolha pra dar tell.</p>
              {onlinePlayers.map((p) => (
                <button
                  key={p.uuid}
                  onClick={() => setTellTarget(p)}
                  className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-3.5 flex items-center gap-3"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#5FBE79]">
                      {p.nick[0]}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C2A20]"
                      style={{ backgroundColor: p.afk ? "#E8A33D" : "#5FBE79" }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#E7E9E2]">{p.nick}</p>
                    <p className="text-[10px]" style={{ color: p.afk ? "#E8A33D" : "#647065" }}>
                      {p.afk ? `AFK · ${p.zone || "?"}` : "ativo"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[#4A574E]" />
                </button>
              ))}
              {onlinePlayers.length === 0 && (
                <p className="text-xs text-[#4A574E]">
                  Ninguém online agora (ou o backend ainda não recebeu presença de ninguém).
                </p>
              )}
            </div>
          )}

          {channel === "tell" && tellTarget && (
            <>
              <div className="px-4 py-2.5 flex items-center gap-3 bg-[#12190F]">
                <button onClick={() => setTellTarget(null)} className="text-[#8FA093]">
                  <ChevronLeft size={18} />
                </button>
                <p className="text-xs font-bold text-[#E7E9E2]">{tellTarget.nick}</p>
                <span className="text-[10px] text-[#5FBE79]">online</span>
              </div>
              <ChannelThread
                messages={rooms[`dm-tell:${tellTarget.uuid}`] || []}
                onSend={(text) => sendChat("tell", tellTarget.uuid, text)}
                placeholder={`Tell para ${tellTarget.nick}...`}
                accent="#5FBE79"
              />
            </>
          )}
        </>
      )}

      {space === "app" && (
        <>
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto border-b border-[#2A3B2E]">
            {appChannels.map((c) => {
              const Icon = c.icon;
              const active = appChannel === c.id;
              const locked = (c.id === "cla" || c.id === "aliados") && !myClan;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setAppChannel(c.id);
                    setAppFriendTarget(null);
                  }}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-2 border transition-colors"
                  style={{
                    backgroundColor: active ? "#7CAAD614" : "#16211A",
                    color: active ? "#7CAAD6" : "#8FA093",
                    borderColor: active ? "#7CAAD6" : "#2A3B2E",
                  }}
                >
                  <Icon size={13} />
                  {c.label}
                  {locked && (
                    <Lock size={10} style={{ color: active ? "#7CAAD6" : "#4A574E" }} />
                  )}
                </button>
              );
            })}
          </div>

          {appFriendTarget && (
            <>
              <div className="px-4 py-2.5 flex items-center gap-3 bg-[#12190F]">
                <button onClick={() => setAppFriendTarget(null)} className="text-[#8FA093]">
                  <ChevronLeft size={18} />
                </button>
                <p className="text-xs font-bold text-[#E7E9E2]">{appFriendTarget.nick}</p>
              </div>
              <ChannelThread
                messages={rooms[`dm-app:${appFriendTarget.uuid}`] || []}
                onSend={(text) => sendChat("app-dm", appFriendTarget.uuid, text)}
                onSendAudio={(base64, mimetype, seconds) =>
                  sendAudio("app-dm", appFriendTarget.uuid, base64, mimetype, seconds)
                }
                onSendImage={(base64, mimetype) => sendImage("app-dm", appFriendTarget.uuid, base64, mimetype)}
                allowAudio
                allowMedia
                placeholder={`Mensagem para ${appFriendTarget.nick}...`}
                accent="#7CAAD6"
              />
            </>
          )}

          {!appFriendTarget && appChannel === "geral" && (
            <div className="flex-1 overflow-y-auto">
              {(friendsList || []).filter((f) => (rooms[`dm-app:${f.uuid}`] || []).length > 0).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center h-full py-16">
                  <MessageSquare size={28} className="text-[#3A4A3E] mb-3" />
                  <p className="text-sm text-[#647065] leading-relaxed">
                    Você ainda não tem conversas por aqui.
                  </p>
                  <button
                    onClick={() => setAppChannel("amigos")}
                    className="mt-4 text-xs font-semibold text-[#0F1712] bg-[#7CAAD6] rounded-lg px-4 py-2"
                  >
                    Iniciar uma conversa
                  </button>
                </div>
              ) : (
                <div className="px-5 py-5 space-y-2">
                  {(friendsList || [])
                    .filter((f) => (rooms[`dm-app:${f.uuid}`] || []).length > 0)
                    .map((f) => {
                      const thread = rooms[`dm-app:${f.uuid}`] || [];
                      const last = thread[thread.length - 1];
                      const live = presence?.[f.uuid];
                      return (
                        <button
                          key={f.uuid}
                          onClick={() => setAppFriendTarget(f)}
                          className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-3.5 flex items-center gap-3"
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#7CAAD6]">
                              {f.nick[0]}
                            </div>
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C2A20]"
                              style={{
                                backgroundColor: !live?.online ? "#C96A5A" : live.afk ? "#E8A33D" : "#5FBE79",
                              }}
                            />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-[#E7E9E2]">{f.nick}</p>
                            <p className="text-[11px] text-[#647065] truncate">
                              {last ? (last.audio ? "🎤 mensagem de áudio" : last.text) : ""}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-[#4A574E]" />
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {!appFriendTarget && appChannel === "cla" && (
            <>
              {!myClan ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
                  <p className="text-sm text-[#647065]">
                    Você não possui nenhum clã, entre agora ou crie para começar a conversar.
                  </p>
                  <div className="w-full flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSpace("servidor");
                        setGameMode("survival");
                        setChannel("cla");
                      }}
                      className="w-full text-xs font-semibold text-[#0F1712] bg-[#7CAAD6] rounded-lg py-2.5"
                    >
                      Ver clãs disponíveis
                    </button>
                  </div>
                  <CreateClanForm onCreate={createClan} accent="#7CAAD6" />
                </div>
              ) : (
                <>
                  <p className="px-5 pt-3 text-[10px] text-[#7CAAD6] leading-relaxed">
                    Fica salvo só aqui no app — não é enviado pro servidor.
                  </p>
                  <ChannelThread
                    messages={clanAppMsgs}
                    onSend={(text) => sendChat("app-cla", null, text)}
                    onSendAudio={(base64, mimetype, seconds) => sendAudio("app-cla", null, base64, mimetype, seconds)}
                    allowAudio
                    placeholder={`Mensagem pro ${myClan.name} (só app)...`}
                    accent="#7CAAD6"
                  />
                </>
              )}
            </>
          )}

          {!appFriendTarget && appChannel === "aliados" && (
            <>
              {!myClan ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
                  <p className="text-sm text-[#647065]">
                    Você não possui nenhum clã, entre agora ou crie para começar a conversar.
                  </p>
                  <div className="w-full flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSpace("servidor");
                        setGameMode("survival");
                        setChannel("cla");
                      }}
                      className="w-full text-xs font-semibold text-[#0F1712] bg-[#7CAAD6] rounded-lg py-2.5"
                    >
                      Ver clãs disponíveis
                    </button>
                  </div>
                  <CreateClanForm onCreate={createClan} accent="#7CAAD6" />
                </div>
              ) : (
                <>
                  <p className="px-5 pt-3 text-[10px] text-[#7CAAD6] leading-relaxed">
                    Fica salvo só aqui no app — não é enviado pro servidor.
                  </p>
                  <ChannelThread
                    messages={alliesAppMsgs}
                    onSend={(text) => sendChat("app-aliados", null, text)}
                    onSendAudio={(base64, mimetype, seconds) =>
                      sendAudio("app-aliados", null, base64, mimetype, seconds)
                    }
                    allowAudio
                    placeholder="Mensagem para os aliados (só app)..."
                    accent="#7CAAD6"
                  />
                </>
              )}
            </>
          )}

          {!appFriendTarget && appChannel === "amigos" && (
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
              <p className="text-xs text-[#8FA093] mb-1">Escolha um amigo pra conversar.</p>
              {(friendsList || []).map((f) => {
                const live = presence?.[f.uuid];
                return (
                  <button
                    key={f.uuid}
                    onClick={() => setAppFriendTarget(f)}
                    className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-3.5 flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#7CAAD6]">
                        {f.nick[0]}
                      </div>
                      {live?.online && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C2A20]"
                          style={{ backgroundColor: live.afk ? "#E8A33D" : "#5FBE79" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-[#E7E9E2]">{f.nick}</p>
                      <p className="text-[10px] text-[#647065]">
                        {live?.online ? (live.afk ? `AFK · ${live.zone || "?"}` : "online") : "offline"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#4A574E]" />
                  </button>
                );
              })}
              {(friendsList || []).length === 0 && (
                <p className="text-xs text-[#4A574E]">
                  Você ainda não tem amigos — adicione na aba Amigos primeiro.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateClanForm({ onCreate, accent = "#5FBE79" }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");

  const submit = () => {
    if (!name.trim() || !tag.trim()) return;
    onCreate(name.trim(), tag.trim().toUpperCase().slice(0, 4));
    setName("");
    setTag("");
  };

  return (
    <div className="w-full border border-dashed border-[#3A4A3E] rounded-xl p-3.5 space-y-2">
      <p className="text-xs font-medium text-[#8FA093]">Criar clã</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do clã"
        className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none"
      />
      <input
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder="Tag (ex: OBS)"
        maxLength={4}
        className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none"
      />
      <button
        onClick={submit}
        className="w-full text-xs font-semibold rounded-lg py-2"
        style={{ backgroundColor: accent, color: "#0F1712" }}
      >
        Criar
      </button>
    </div>
  );
}

function ClanManageScreen({ myClan, authToken, onBack, onChanged, clanList }) {
  const [tab, setTab] = useState("membros"); // membros | aliancas
  const [members, setMembers] = useState([]);
  const [pendingAlliances, setPendingAlliances] = useState([]);
  const [proposeTarget, setProposeTarget] = useState("");
  const [error, setError] = useState("");
  const isLeader = myClan.myRole === "lider";

  const loadMembers = async () => {
    try {
      const data = await apiFetch("/app/clan/members", { token: authToken });
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadPending = async () => {
    try {
      const data = await apiFetch("/app/clan/alliance/pending", { token: authToken });
      setPendingAlliances(data.proposals || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadMembers();
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kick = async (targetUuid) => {
    try {
      await apiFetch("/app/clan/kick", { method: "POST", body: { targetUuid }, token: authToken });
      loadMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const propose = async () => {
    if (!proposeTarget) return;
    try {
      await apiFetch("/app/clan/alliance/propose", {
        method: "POST",
        body: { targetClanId: Number(proposeTarget) },
        token: authToken,
      });
      setProposeTarget("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const accept = async (otherClanId) => {
    try {
      await apiFetch("/app/clan/alliance/accept", {
        method: "POST",
        body: { otherClanId },
        token: authToken,
      });
      loadPending();
    } catch (err) {
      setError(err.message);
    }
  };

  const otherClans = (clanList || []).filter((c) => c.id !== myClan.id);

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2.5 flex items-center gap-3 bg-[#12190F]">
        <button onClick={onBack} className="text-[#8FA093]">
          <ChevronLeft size={18} />
        </button>
        <p className="text-xs font-bold text-[#E7E9E2]">{myClan.name}</p>
      </div>

      <div className="px-5 pt-4">
        <div className="flex bg-[#16211A] border border-[#2A3B2E] rounded-xl p-1">
          <button
            onClick={() => setTab("membros")}
            className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors ${
              tab === "membros" ? "bg-[#5FBE79] text-[#0F1712]" : "text-[#8FA093]"
            }`}
          >
            Membros
          </button>
          <button
            onClick={() => setTab("aliancas")}
            className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors ${
              tab === "aliancas" ? "bg-[#5FBE79] text-[#0F1712]" : "text-[#8FA093]"
            }`}
          >
            Alianças
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {error && <p className="text-xs text-[#E8A33D]">{error}</p>}

        {tab === "membros" &&
          members.map((m) => (
            <div
              key={m.uuid}
              className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-3.5 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#5FBE79]">
                {m.nick[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[#E7E9E2]">{m.nick}</p>
                {m.role === "lider" && (
                  <span className="text-[9px] font-bold text-[#E8A33D]">LÍDER</span>
                )}
              </div>
              {isLeader && m.role !== "lider" && (
                <button
                  onClick={() => kick(m.uuid)}
                  className="text-[11px] font-semibold text-[#C96A5A] border border-[#C96A5A]/40 rounded-lg px-2.5 py-1.5"
                >
                  Expulsar
                </button>
              )}
            </div>
          ))}

        {tab === "aliancas" && (
          <>
            {isLeader ? (
              <div className="bg-[#1C2A20] border border-[#5FBE79]/40 rounded-xl p-4 space-y-2.5">
                <p className="text-xs text-[#8FA093]">Propor aliança a outro clã</p>
                <select
                  value={proposeTarget}
                  onChange={(e) => setProposeTarget(e.target.value)}
                  className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] outline-none"
                >
                  <option value="">Escolha um clã</option>
                  {otherClans.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tag})
                    </option>
                  ))}
                </select>
                <button
                  onClick={propose}
                  className="w-full bg-[#5FBE79] text-[#0F1712] font-semibold rounded-lg py-2 text-sm"
                >
                  Propor
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#647065]">Só o líder do clã pode propor ou aceitar alianças.</p>
            )}

            {pendingAlliances.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-2 mt-2">
                  Propostas recebidas
                </p>
                <div className="space-y-2">
                  {pendingAlliances.map((p) => (
                    <div
                      key={p.clanId}
                      className="bg-[#1C2A20] border border-[#E8A33D]/30 rounded-xl p-3.5 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#E8A33D]/15 flex items-center justify-center text-[#E8A33D] text-xs font-bold">
                        {p.tag}
                      </div>
                      <p className="text-sm font-semibold text-[#E7E9E2] flex-1">{p.name}</p>
                      {isLeader && (
                        <button
                          onClick={() => accept(p.clanId)}
                          className="text-[11px] font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-2.5 py-1.5"
                        >
                          Aceitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --------------------------------- Amigos -------------------------------------

function FriendsScreen({
  rooms,
  sendChat,
  sendAudio,
  sendImage,
  myUuid,
  presence,
  authToken,
  friendsList,
  friendRequests,
  refreshFriends,
}) {
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [addNick, setAddNick] = useState("");
  const [error, setError] = useState("");

  const messages = active ? rooms[`dm-app:${active.uuid}`] || [] : [];

  const send = () => {
    if (!draft.trim() || !active) return;
    sendChat("app-dm", active.uuid, draft);
    setDraft("");
  };

  const sendImagePicked = (base64, mimetype) => {
    if (!active) return;
    sendImage("app-dm", active.uuid, base64, mimetype);
  };

  const sendFriendRequest = async () => {
    if (!addNick.trim()) return;
    try {
      const result = await apiFetch("/app/friends/request", {
        method: "POST",
        body: { nick: addNick.trim() },
        token: authToken,
      });
      setAddNick("");
      setAdding(false);
      setError("");
      refreshFriends();
      if (result.autoAccepted) {
        // o outro já tinha mandado pedido — virou amigo na hora
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const accept = async (requestId) => {
    try {
      await apiFetch(`/app/friends/requests/${requestId}/accept`, { method: "POST", token: authToken });
      refreshFriends();
    } catch (err) {
      setError(err.message);
    }
  };

  const reject = async (requestId) => {
    try {
      await apiFetch(`/app/friends/requests/${requestId}/reject`, { method: "POST", token: authToken });
      refreshFriends();
    } catch (err) {
      setError(err.message);
    }
  };

  if (active) {
    const live = presence?.[active.uuid];
    const online = live?.online || false;
    const afk = live?.afk || false;

    return (
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-[#2A3B2E] flex items-center gap-3">
          <button onClick={() => setActive(null)} className="text-[#8FA093]">
            <ChevronLeft size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#2A3B2E] flex items-center justify-center text-xs font-bold text-[#5FBE79]">
            {active.nick[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E7E9E2]">{active.nick}</p>
            <p className="text-[10px] text-[#647065]">
              {online ? (afk ? "AFK" : "online") : "offline"}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                  m.me
                    ? "bg-[#5FBE79] text-[#0F1712] rounded-br-sm"
                    : "bg-[#1C2A20] border border-[#2A3B2E] text-[#E7E9E2] rounded-bl-sm"
                }`}
              >
                {m.audio ? (
                  <AudioBubble url={m.audioUrl} me={m.me} duration={m.duration} />
                ) : m.media ? (
                  <ImageBubble url={m.mediaUrl} />
                ) : (
                  <p className="text-sm leading-snug">{m.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-[#2A3B2E] flex items-center gap-2">
          {!draft && <ImagePickerButton onPicked={sendImagePicked} />}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Mensagem..."
            className="flex-1 bg-[#16211A] border border-[#2A3B2E] rounded-full px-4 py-2.5 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79]"
          />
          {!draft && (
            <AudioRecordButton
              onRecorded={(base64, mimetype, seconds) => sendAudio("app-dm", active.uuid, base64, mimetype, seconds)}
            />
          )}
          <button
            onClick={send}
            className="w-9 h-9 rounded-full bg-[#5FBE79] flex items-center justify-center shrink-0"
          >
            <Send size={15} className="text-[#0F1712]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#E7E9E2]">Amigos</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-2"
          >
            <Plus size={14} /> Adicionar
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-[#1C2A20] border border-[#5FBE79]/40 rounded-xl p-4 space-y-2.5">
          <input
            value={addNick}
            onChange={(e) => setAddNick(e.target.value)}
            placeholder="Nick do jogador"
            className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79]"
          />
          {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={sendFriendRequest}
              className="flex-1 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-lg py-2 text-sm"
            >
              Enviar pedido
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError("");
              }}
              className="px-4 text-xs text-[#8FA093]"
            >
              cancelar
            </button>
          </div>
        </div>
      )}

      {friendRequests?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-2">
            Pedidos recebidos
          </p>
          <div className="space-y-2">
            {friendRequests.map((r) => (
              <div
                key={r.id}
                className="bg-[#1C2A20] border border-[#E8A33D]/30 rounded-xl p-3.5 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#E8A33D]">
                  {r.from_nick[0]}
                </div>
                <p className="text-sm font-semibold text-[#E7E9E2] flex-1">{r.from_nick}</p>
                <button
                  onClick={() => accept(r.id)}
                  className="text-[11px] font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-2.5 py-1.5"
                >
                  Aceitar
                </button>
                <button
                  onClick={() => reject(r.id)}
                  className="text-[11px] font-semibold text-[#8FA093] border border-[#2A3B2E] rounded-lg px-2.5 py-1.5"
                >
                  Recusar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(friendsList || []).map((f) => {
          const live = presence?.[f.uuid];
          const online = live?.online || false;
          const afk = live?.afk || false;
          const zone = live?.zone;
          return (
            <button
              key={f.uuid}
              onClick={() => setActive(f)}
              className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-3.5 flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#5FBE79]">
                  {f.nick[0]}
                </div>
                {online && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C2A20]"
                    style={{ backgroundColor: afk ? "#E8A33D" : "#5FBE79" }}
                  />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[#E7E9E2]">{f.nick}</p>
                <p
                  className="text-[11px]"
                  style={{ color: online ? (afk ? "#E8A33D" : "#5FBE79") : "#647065" }}
                >
                  {online ? (afk ? `AFK · ${zone || "?"}` : "online") : "offline"}
                </p>
              </div>
              <ChevronRight size={16} className="text-[#4A574E]" />
            </button>
          );
        })}
        {(friendsList || []).length === 0 && (
          <p className="text-xs text-[#4A574E]">Você ainda não tem amigos adicionados.</p>
        )}
      </div>
    </div>
  );
}
// ------------------------------------ Feed ---------------------------------------

function FeedScreen({ isStaff, authToken }) {
  const [posts, setPosts] = useState([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachMedia, setAttachMedia] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch("/app/feed/list", { token: authToken });
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    }
  };

  useEffect(() => {
    if (authToken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const publishStaff = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      await apiFetch("/app/feed/create", {
        method: "POST",
        body: { title, body, media: attachMedia },
        token: authToken,
      });
      setTitle("");
      setBody("");
      setAttachMedia(false);
      setComposing(false);
      load();
    } catch {
      // silencioso
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#E7E9E2]">Feed</h2>
        {isStaff && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1712] bg-[#E8A33D] rounded-lg px-3 py-2"
          >
            <Plus size={14} /> Postar
          </button>
        )}
      </div>

      {composing && (
        <div className="bg-[#1C2A20] border border-[#E8A33D]/40 rounded-xl p-4 space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#E8A33D] font-semibold">
            Nova atualização (staff)
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#E8A33D]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Descreva a atualização..."
            rows={3}
            className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#E8A33D] resize-none"
          />
          <button
            onClick={() => setAttachMedia((v) => !v)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium border ${
              attachMedia
                ? "border-[#E8A33D] text-[#E8A33D] bg-[#E8A33D]/10"
                : "border-[#2A3B2E] text-[#8FA093]"
            }`}
          >
            <ImageIcon size={14} /> {attachMedia ? "Mídia anexada" : "Anexar mídia"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={publishStaff}
              className="flex-1 bg-[#E8A33D] text-[#0F1712] font-semibold rounded-lg py-2 text-sm"
            >
              Publicar
            </button>
            <button onClick={() => setComposing(false)} className="px-4 text-xs text-[#8FA093]">
              cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((u) => (
          <div key={u.id} className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield size={12} className="text-[#E8A33D]" />
              <p className="text-[11px] font-semibold text-[#E8A33D]">{u.author_nick}</p>
              <span className="text-[10px] text-[#4A574E]">· {u.created_at}</span>
            </div>
            <p className="text-sm font-bold text-[#E7E9E2]">{u.title}</p>
            <p className="text-xs text-[#8FA093] mt-1 leading-relaxed">{u.body}</p>
            {u.media && (
              <div className="mt-2 w-full h-24 rounded-lg bg-[#16211A] border border-[#2A3B2E] flex items-center justify-center">
                <ImageIcon size={18} className="text-[#4A574E]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------- Loja ---------------------------------------

function ShopScreen({ authToken }) {
  const [cat, setCat] = useState("mural");
  const [ads, setAds] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [composing, setComposing] = useState(false);
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [selectedAd, setSelectedAd] = useState(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [auctionDetail, setAuctionDetail] = useState(null);
  const [bidValue, setBidValue] = useState("");
  const [error, setError] = useState("");
  const [onlineCatalog, setOnlineCatalog] = useState([]);
  const [onlineError, setOnlineError] = useState("");
  const [checkingOutSku, setCheckingOutSku] = useState(null);

  const cats = [
    { id: "mural", label: "Mural", icon: Tag },
    { id: "leilao", label: "Leilão", icon: Gavel },
    { id: "online", label: "Online", icon: Globe },
  ];

  const loadOnlineCatalog = async () => {
    try {
      const data = await apiFetch("/app/store/catalog", { token: authToken });
      setOnlineCatalog(data.catalog || []);
      setOnlineError("");
    } catch (err) {
      setOnlineCatalog([]);
      setOnlineError(err.message);
    }
  };

  useEffect(() => {
    if (authToken && cat === "online") loadOnlineCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, cat]);

  const checkout = async (sku) => {
    setCheckingOutSku(sku);
    try {
      const data = await apiFetch("/app/store/checkout", { method: "POST", body: { sku }, token: authToken });
      window.open(data.checkoutUrl, "_blank");
    } catch (err) {
      setOnlineError(err.message);
    } finally {
      setCheckingOutSku(null);
    }
  };

  const loadAds = async () => {
    try {
      const data = await apiFetch("/app/market/list", { token: authToken });
      setAds(data.ads || []);
    } catch {
      setAds([]);
    }
  };

  const loadAuctions = async () => {
    try {
      const data = await apiFetch("/app/auctions/list", { token: authToken });
      setAuctions(data.auctions || []);
    } catch {
      setAuctions([]);
    }
  };

  useEffect(() => {
    if (!authToken) return;
    if (cat === "mural") loadAds();
    if (cat === "leilao") loadAuctions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, cat]);

  const publishAd = async () => {
    if (!item.trim() || !price.trim()) return;
    try {
      await apiFetch("/app/market/create", { method: "POST", body: { item, price }, token: authToken });
      setItem("");
      setPrice("");
      setComposing(false);
      loadAds();
    } catch (err) {
      setError(err.message);
    }
  };

  const openAuction = async (id) => {
    setSelectedAuctionId(id);
    try {
      const data = await apiFetch(`/app/auctions/${id}`, { token: authToken });
      setAuctionDetail(data.auction);
    } catch (err) {
      setError(err.message);
    }
  };

  const placeBid = async () => {
    const amount = Number(bidValue);
    if (!amount) return;
    try {
      await apiFetch(`/app/auctions/${selectedAuctionId}/bid`, {
        method: "POST",
        body: { amount },
        token: authToken,
      });
      setBidValue("");
      setError("");
      openAuction(selectedAuctionId);
    } catch (err) {
      setError(err.message);
    }
  };

  if (selectedAd) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <button
          onClick={() => setSelectedAd(null)}
          className="flex items-center gap-1 text-xs text-[#8FA093]"
        >
          <ChevronLeft size={14} /> voltar pro mural
        </button>

        <div>
          <h2 className="text-lg font-bold text-[#E7E9E2] leading-snug">{selectedAd.item}</h2>
          <p className="text-2xl font-bold text-[#5FBE79] mt-2">{selectedAd.price}</p>
        </div>

        <div className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#5FBE79]">
            {selectedAd.seller_nick?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E7E9E2]">{selectedAd.seller_nick}</p>
            <p className="text-[11px] text-[#647065]">anunciado em {selectedAd.created_at}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button className="w-full bg-[#5FBE79] text-[#0F1712] font-semibold rounded-xl py-3">
            Contatar {selectedAd.seller_nick}
          </button>
          <button className="w-full text-xs text-[#647065] py-2">Denunciar anúncio</button>
        </div>
      </div>
    );
  }

  if (selectedAuctionId) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <button
          onClick={() => {
            setSelectedAuctionId(null);
            setAuctionDetail(null);
            setError("");
          }}
          className="flex items-center gap-1 text-xs text-[#8FA093]"
        >
          <ChevronLeft size={14} /> voltar pro leilão
        </button>

        {!auctionDetail ? (
          <p className="text-sm text-[#647065]">Carregando...</p>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-[#E7E9E2] leading-snug">{auctionDetail.item_name}</h2>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#E8A33D]">
                <Clock size={11} /> encerra em {auctionDetail.ends_at}
              </div>
            </div>

            <div className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2A3B2E] flex items-center justify-center text-sm font-bold text-[#5FBE79]">
                {auctionDetail.seller_nick?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E7E9E2]">{auctionDetail.seller_nick}</p>
                <p className="text-[11px] text-[#647065]">leiloeiro</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-2">
                Histórico de lances
              </p>
              <div className="space-y-1.5">
                {(auctionDetail.bids || []).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between bg-[#1C2A20] border border-[#2A3B2E] rounded-lg px-3 py-2"
                  >
                    <p className="text-xs text-[#E7E9E2]">{b.nick}</p>
                    <p className="text-xs font-semibold text-[#5FBE79]">
                      {b.amount} {auctionDetail.economy}
                    </p>
                  </div>
                ))}
                {(auctionDetail.bids || []).length === 0 && (
                  <p className="text-xs text-[#4A574E]">Nenhum lance ainda.</p>
                )}
              </div>
            </div>

            <div className="bg-[#1C2A20] border border-[#5FBE79]/40 rounded-xl p-4 space-y-2.5">
              <p className="text-xs text-[#8FA093]">
                Lance atual:{" "}
                <span className="text-[#5FBE79] font-bold">
                  {auctionDetail.current_bid} {auctionDetail.economy}
                </span>
              </p>
              <input
                value={bidValue}
                onChange={(e) => setBidValue(e.target.value)}
                placeholder={`Seu lance (mínimo acima de ${auctionDetail.current_bid})`}
                inputMode="numeric"
                className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79]"
              />
              {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
              <button
                onClick={placeBid}
                className="w-full bg-[#5FBE79] text-[#0F1712] font-semibold rounded-lg py-2.5 text-sm"
              >
                Confirmar lance
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <h2 className="text-lg font-bold text-[#E7E9E2]">Loja</h2>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {cats.map((c) => {
          const Icon = c.icon;
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-2 border transition-colors"
              style={{
                backgroundColor: active ? "#5FBE7914" : "#16211A",
                color: active ? "#5FBE79" : "#8FA093",
                borderColor: active ? "#5FBE79" : "#2A3B2E",
              }}
            >
              <Icon size={13} />
              {c.label}
            </button>
          );
        })}
      </div>

      {cat === "mural" && (
        <>
          <div className="flex items-center justify-between -mt-1">
            <p className="text-xs text-[#647065]">Itens anunciados pelos próprios jogadores.</p>
            {!composing && (
              <button
                onClick={() => setComposing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-2 shrink-0"
              >
                <Plus size={13} /> Anunciar
              </button>
            )}
          </div>

          {composing && (
            <div className="bg-[#1C2A20] border border-[#5FBE79]/40 rounded-xl p-4 space-y-2.5">
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="O que você está vendendo?"
                className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79]"
              />
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Preço (ex: 500 coins)"
                className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79]"
              />
              {error && <p className="text-xs text-[#E8A33D]">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={publishAd}
                  className="flex-1 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-lg py-2 text-sm"
                >
                  Publicar anúncio
                </button>
                <button onClick={() => setComposing(false)} className="px-4 text-xs text-[#8FA093]">
                  cancelar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {ads.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAd(a)}
                className="w-full text-left bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#E7E9E2] truncate">{a.item}</p>
                  <p className="text-[11px] text-[#647065] mt-0.5">por {a.seller_nick}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-[#5FBE79]">{a.price}</p>
                  <span className="mt-2 inline-block text-[11px] font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-1.5">
                    Ver anúncio
                  </span>
                </div>
              </button>
            ))}
            {ads.length === 0 && <p className="text-xs text-[#4A574E]">Nenhum anúncio ainda.</p>}
          </div>
        </>
      )}

      {cat === "leilao" && (
        <>
          <div className="flex items-center justify-between -mt-1">
            <p className="text-xs text-[#647065]">Leilões ativos de jogadores.</p>
            <span className="text-[10px] text-[#4A574E]">Use /leiloar no jogo pra criar um</span>
          </div>
          <div className="space-y-2.5">
            {auctions.map((a) => (
              <button
                key={a.id}
                onClick={() => openAuction(a.id)}
                className="w-full text-left bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#E7E9E2]">{a.item_name}</p>
                  <p className="text-[11px] text-[#647065] mt-0.5">por {a.seller_nick}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#8FA093]">
                    <Clock size={10} /> encerra em {a.ends_at}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#5FBE79]">
                    {a.current_bid} {a.economy}
                  </p>
                  <span className="mt-2 inline-block text-[11px] font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-1.5">
                    Ver leilão
                  </span>
                </div>
              </button>
            ))}
            {auctions.length === 0 && <p className="text-xs text-[#4A574E]">Nenhum leilão ativo.</p>}
          </div>
        </>
      )}

      {cat === "online" && (
        <>
          <p className="text-xs text-[#647065] -mt-1">
            Compra com dinheiro real, via Mercado Pago. Entrega automática in-game sempre que
            possível.
          </p>
          {onlineError && <p className="text-xs text-[#E8A33D]">{onlineError}</p>}
          <div className="grid grid-cols-2 gap-3">
            {onlineCatalog.map((it) => {
              const Icon = ONLINE_ICONS[it.sku] || Coins;
              return (
                <div
                  key={it.sku}
                  className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#E8A33D]/15 flex items-center justify-center">
                    <Icon size={17} className="text-[#E8A33D]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#E7E9E2] leading-snug">{it.name}</p>
                    <p className="text-xs text-[#8FA093] mt-1">{it.price}</p>
                  </div>
                  <button
                    onClick={() => checkout(it.sku)}
                    disabled={checkingOutSku === it.sku}
                    className="mt-1 text-xs font-semibold text-[#0F1712] bg-[#E8A33D] rounded-lg py-2 disabled:opacity-60"
                  >
                    {checkingOutSku === it.sku ? "Abrindo..." : "Comprar"}
                  </button>
                </div>
              );
            })}
            {onlineCatalog.length === 0 && !onlineError && (
              <p className="text-xs text-[#4A574E] col-span-2">Carregando catálogo...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------- Sugestões ---------------------------------------

function SuggestionsScreen({ isStaff, authToken }) {
  const [items, setItems] = useState([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const statusMap = {
    analise: { label: "Em análise", color: "#8FA093", bg: "#8FA093" },
    aprovada: { label: "Aprovada", color: "#5FBE79", bg: "#5FBE79" },
    recusada: { label: "Recusada", color: "#C96A5A", bg: "#C96A5A" },
  };

  const load = async () => {
    try {
      const data = await apiFetch("/app/suggestions/list", { token: authToken });
      setItems(data.suggestions || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (authToken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const toggleVote = async (id) => {
    try {
      await apiFetch(`/app/suggestions/${id}/vote`, { method: "POST", token: authToken });
      load();
    } catch {
      // silencioso — próxima carga já corrige o estado
    }
  };

  const setStatus = async (id, status) => {
    try {
      await apiFetch(`/app/suggestions/${id}/status`, { method: "POST", body: { status }, token: authToken });
      load();
    } catch {
      // silencioso
    }
  };

  const publish = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      await apiFetch("/app/suggestions/create", { method: "POST", body: { title, body }, token: authToken });
      setTitle("");
      setBody("");
      setComposing(false);
      load();
    } catch {
      // silencioso
    }
  };

  const sorted = [...items].sort((a, b) => b.votes - a.votes);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#E7E9E2]">Sugestões</h2>
        {!composing && (
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-2"
          >
            <Plus size={14} /> Sugerir
          </button>
        )}
      </div>

      {composing && (
        <div className="bg-[#1C2A20] border border-[#5FBE79]/40 rounded-xl p-4 space-y-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da sugestão"
            className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Descreva a ideia..."
            rows={3}
            className="w-full bg-[#16211A] border border-[#2A3B2E] rounded-lg px-3 py-2 text-sm text-[#E7E9E2] placeholder:text-[#4A574E] outline-none focus:border-[#5FBE79] resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={publish}
              className="flex-1 bg-[#5FBE79] text-[#0F1712] font-semibold rounded-lg py-2 text-sm"
            >
              Publicar
            </button>
            <button onClick={() => setComposing(false)} className="px-4 text-xs text-[#8FA093]">
              cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((s) => {
          const st = statusMap[s.status];
          return (
            <div key={s.id} className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleVote(s.id)}
                  className={`flex flex-col items-center justify-center w-11 h-12 rounded-lg border shrink-0 transition-colors ${
                    s.voted
                      ? "bg-[#5FBE79] border-[#5FBE79] text-[#0F1712]"
                      : "bg-[#16211A] border-[#2A3B2E] text-[#8FA093]"
                  }`}
                >
                  <ArrowBigUp size={16} fill={s.voted ? "#0F1712" : "none"} />
                  <span className="text-[10px] font-bold leading-none mt-0.5">{s.votes}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[11px] font-semibold text-[#8FA093]">{s.author_nick}</p>
                    <span className="text-[10px] text-[#4A574E]">· {s.created_at}</span>
                  </div>
                  <p className="text-sm font-bold text-[#E7E9E2]">{s.title}</p>
                  <p className="text-xs text-[#8FA093] mt-1 leading-relaxed">{s.body}</p>

                  <div className="flex items-center justify-between mt-2.5">
                    <span
                      className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                      style={{ color: st.color, backgroundColor: `${st.bg}22` }}
                    >
                      {st.label}
                    </span>

                    {isStaff && (
                      <div className="flex gap-1">
                        {Object.keys(statusMap).map((key) => (
                          <button
                            key={key}
                            onClick={() => setStatus(s.id, key)}
                            className={`text-[9px] font-semibold rounded-full px-2 py-1 border ${
                              s.status === key
                                ? "border-transparent text-[#0F1712]"
                                : "border-[#2A3B2E] text-[#647065]"
                            }`}
                            style={s.status === key ? { backgroundColor: statusMap[key].bg } : {}}
                          >
                            {statusMap[key].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------ EdenPoints ----------------------------------

function PointsScreen({ authToken }) {
  const [tab, setTab] = useState("missoes"); // missoes | resgatar
  const [balance, setBalance] = useState(0);
  const [missions, setMissions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");

  const statusMap = {
    disponivel: { label: "Disponível", color: "#8FA093" },
    ativa: { label: "Em andamento", color: "#E8A33D" },
    concluida: { label: "Concluída", color: "#5FBE79" },
  };

  const rewardIcon = (grantType) => (grantType === "coins" ? Coins : Trophy);

  const loadMissions = async () => {
    try {
      const data = await apiFetch("/app/points/missions", { token: authToken });
      setMissions(data.missions || []);
      setBalance(data.balance || 0);
    } catch {
      setMissions([]);
    }
  };

  const loadRewards = async () => {
    try {
      const data = await apiFetch("/app/points/rewards", { token: authToken });
      setRewards(data.rewards || []);
      setBalance(data.balance || 0);
    } catch {
      setRewards([]);
    }
  };

  useEffect(() => {
    if (!authToken) return;
    loadMissions();
    loadRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const acceptMission = async (id) => {
    try {
      await apiFetch(`/app/points/missions/${id}/accept`, { method: "POST", token: authToken });
      loadMissions();
    } catch (err) {
      setError(err.message);
    }
  };

  const redeem = async (reward) => {
    if (balance < reward.cost) return;
    try {
      await apiFetch(`/app/points/rewards/${reward.id}/redeem`, { method: "POST", token: authToken });
      loadRewards();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#E7E9E2]">EdenPoints</h2>
        <div className="mt-3 bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5FBE79]/15 flex items-center justify-center">
            <Trophy size={18} className="text-[#5FBE79]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#E7E9E2]">{balance}</p>
            <p className="text-[11px] text-[#647065]">pontos disponíveis</p>
          </div>
        </div>
      </div>

      <div className="flex bg-[#16211A] border border-[#2A3B2E] rounded-xl p-1">
        <button
          onClick={() => setTab("missoes")}
          className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors ${
            tab === "missoes" ? "bg-[#5FBE79] text-[#0F1712]" : "text-[#8FA093]"
          }`}
        >
          Missões
        </button>
        <button
          onClick={() => setTab("resgatar")}
          className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors ${
            tab === "resgatar" ? "bg-[#5FBE79] text-[#0F1712]" : "text-[#8FA093]"
          }`}
        >
          Resgatar
        </button>
      </div>

      {tab === "missoes" && (
        <div className="space-y-2.5">
          {missions.map((m) => {
            const st = statusMap[m.status];
            return (
              <div key={m.id} className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#E7E9E2]">{m.title}</p>
                    <p className="text-xs text-[#8FA093] mt-1 leading-relaxed">{m.description}</p>
                  </div>
                  <p className="text-sm font-bold text-[#5FBE79] shrink-0">+{m.points}</p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span
                    className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                    style={{ color: st.color, backgroundColor: `${st.color}22` }}
                  >
                    {st.label}
                  </span>
                  {m.status === "disponivel" && (
                    <button
                      onClick={() => acceptMission(m.id)}
                      className="text-[11px] font-semibold text-[#0F1712] bg-[#5FBE79] rounded-lg px-3 py-1.5"
                    >
                      Aceitar
                    </button>
                  )}
                  {m.status === "ativa" && (
                    <span className="text-[10px] text-[#647065]">cumpra no servidor</span>
                  )}
                </div>
              </div>
            );
          })}
          {error && <p className="text-xs text-[#E8A33D] px-1">{error}</p>}
          <p className="text-[10px] text-[#4A574E] px-1 leading-relaxed">
            O plugin confirma a missão sozinho ao detectar a ação no servidor.
          </p>
        </div>
      )}

      {tab === "resgatar" && (
        <div className="grid grid-cols-2 gap-3">
          {rewards.map((r) => {
            const Icon = rewardIcon(r.grant_type);
            const can = balance >= r.cost;
            return (
              <div
                key={r.id}
                className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-[#5FBE79]/15 flex items-center justify-center">
                  <Icon size={17} className="text-[#5FBE79]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E7E9E2] leading-snug">{r.name}</p>
                  <p className="text-xs text-[#8FA093] mt-1">{r.cost} pontos</p>
                </div>
                <button
                  onClick={() => redeem(r)}
                  disabled={!can}
                  className={`mt-1 text-xs font-semibold rounded-lg py-2 ${
                    can
                      ? "text-[#0F1712] bg-[#5FBE79]"
                      : "text-[#647065] bg-[#16211A] border border-[#2A3B2E]"
                  }`}
                >
                  Resgatar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------------------------------------ Config -------------------------------------

// ------------------------------------ Perfil -------------------------------------

function ProfileScreen({ nick, role }) {
  const stats = [
    { label: "No servidor desde", value: "mar 2025" },
    { label: "Clã", value: "Raízes de Obsidiana" },
    { label: "Sugestões enviadas", value: "3" },
  ];
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-20 h-20 rounded-2xl bg-[#1C2A20] border border-[#2A3B2E] flex items-center justify-center text-2xl font-bold text-[#5FBE79] mb-3">
          {nick ? nick[0] : "?"}
        </div>
        <p className="text-lg font-bold text-[#E7E9E2]">{nick}</p>
        {role ? (
          <span className="mt-1.5 flex items-center gap-1 bg-[#E8A33D]/15 border border-[#E8A33D]/40 rounded-full px-2.5 py-1">
            <Shield size={11} className="text-[#E8A33D]" />
            <span className="text-[10px] font-bold text-[#E8A33D] tracking-wide">
              {role.toUpperCase()}
            </span>
          </span>
        ) : (
          <p className="text-xs text-[#647065] mt-1">Jogador</p>
        )}
      </div>

      <div className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl divide-y divide-[#2A3B2E]">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between px-4 py-3.5">
            <p className="text-xs text-[#8FA093]">{s.label}</p>
            <p className="text-sm font-semibold text-[#E7E9E2]">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigScreen({ setTab, onLogout }) {
  const links = [
    { id: "perfil", label: "Perfil", desc: "Seu nick, cargo e estatísticas", icon: Users },
    { id: "pontos", label: "EdenPoints", desc: "Missões, saldo de pontos e resgate", icon: Trophy },
    { id: "amigos", label: "Amigos", desc: "Conversas e lista de amigos", icon: UserPlus },
    { id: "sugestoes", label: "Sugestões", desc: "Ideias da comunidade pro servidor", icon: Lightbulb },
  ];

  const [muted, setMuted] = useState({ cla: false, aliados: false, global: false, tell: false });
  const channelPrefs = [
    { id: "cla", label: "Clã", icon: Users },
    { id: "aliados", label: "Aliados", icon: Handshake },
    { id: "global", label: "Global", icon: Globe },
    { id: "tell", label: "Tell", icon: AtSign },
  ];

  const toggle = (id) => setMuted((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      <h2 className="text-lg font-bold text-[#E7E9E2]">Config</h2>

      <div className="space-y-2">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <button
              key={l.id}
              onClick={() => setTab(l.id)}
              className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#5FBE79]/15 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-[#5FBE79]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[#E7E9E2]">{l.label}</p>
                <p className="text-[11px] text-[#647065]">{l.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[#4A574E]" />
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-1">
          Mensagens do app no jogo
        </p>
        <p className="text-[11px] text-[#4A574E] mb-3 leading-relaxed">
          Desative por canal pra não receber avisos do app enquanto joga. Vale também pro comando{" "}
          <span className="font-mono text-[#647065]">/app mudo</span> dentro do servidor.
        </p>
        <div className="bg-[#1C2A20] border border-[#2A3B2E] rounded-xl divide-y divide-[#2A3B2E]">
          {channelPrefs.map((c) => {
            const Icon = c.icon;
            const on = !muted[c.id];
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                <Icon size={16} className="text-[#8FA093]" />
                <p className="text-sm text-[#E7E9E2] flex-1">{c.label}</p>
                <button
                  onClick={() => toggle(c.id)}
                  className="w-10 h-6 rounded-full relative transition-colors shrink-0"
                  style={{ backgroundColor: on ? "#5FBE79" : "#2A3B2E" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-[#0F1712] transition-all"
                    style={{ left: on ? "18px" : "2px" }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#647065] mb-3">Conta</p>
        <button
          onClick={() => {
            if (confirm("Desvincular e sair da conta nesse aparelho? Você pode entrar de novo com nick e senha, ou vinculando um novo código.")) {
              onLogout();
            }
          }}
          className="w-full bg-[#1C2A20] border border-[#2A3B2E] rounded-xl p-4 flex items-center justify-between text-left"
        >
          <span className="text-sm font-medium text-[#C96A5A]">Desvincular conta</span>
          <ChevronRight size={16} className="text-[#4A574E]" />
        </button>
      </div>
    </div>
  );
}

// ------------------------------------ App ---------------------------------------

export default function EdenMCApp() {
  // Sessao salva localmente -- assim o app nao pede pra vincular de novo
  // toda vez que abre. So le uma vez, na montagem inicial (useState com
  // funcao de inicializacao roda so na primeira renderizacao).
  const [session] = useState(() => {
    try {
      const raw = localStorage.getItem("edenmc:session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // localStorage indisponivel ou dado corrompido -- pede login normal
    }
  });

  const [linked, setLinked] = useState(!!session);
  const [nick, setNick] = useState(session?.nick || "");
  const [authToken, setAuthToken] = useState(session?.token || "");
  const [myUuid, setMyUuid] = useState(session?.uuid || "");
  const [tab, setTab] = useState("home");
  const [chatSpace, setChatSpace] = useState("servidor"); // servidor | app
  const ROLES = [null, "Moderador", "Administrador"];
  const [roleIndex, setRoleIndex] = useState(1); // alternar pra simular cargos diferentes
  const role = ROLES[roleIndex];
  const isStaff = !!role;

  // Chamado tanto no vinculo quanto no login -- guarda a sessao pra
  // sobreviver a proxima vez que o app for aberto.
  const persistSession = (n, tok, uuid) => {
    try {
      localStorage.setItem("edenmc:session", JSON.stringify({ nick: n, token: tok, uuid }));
    } catch {
      // localStorage indisponivel (modo privado, storage cheio, etc.) --
      // o app ainda funciona nessa sessao, so nao vai lembrar da proxima vez
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("edenmc:session");
    } catch {
      // nada a fazer se nem isso funcionar
    }
    setLinked(false);
    setAuthToken("");
    setMyUuid("");
    setNick("");
  };

  // Chat em tempo real: uma conexão só, aberta assim que loga, mantida
  // enquanto o app estiver aberto — não depende de qual aba está ativa,
  // então trocar de tela não derruba a conversa nem perde mensagem.
  const socketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [rooms, setRooms] = useState({}); // roomKey -> array de mensagens
  const [presence, setPresence] = useState({}); // uuid -> { online, afk, zone }
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  const refreshFriends = async () => {
    if (!authToken) return;
    try {
      const [friendsData, requestsData] = await Promise.all([
        apiFetch("/app/friends/list", { token: authToken }),
        apiFetch("/app/friends/requests", { token: authToken }),
      ]);
      setFriendsList(friendsData.friends || []);
      setFriendRequests(requestsData.requests || []);
    } catch {
      // sem conexão ainda — mantém o que já tinha
    }
  };

  useEffect(() => {
    refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (!linked || !authToken) return;

    let cancelled = false;
    let socket = null;
    let reconnectTimer = null;
    let attempt = 0;

    const handleMessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "message") {
        const key = roomKeyFor(data.channel, data.scopeId, data.senderUuid, myUuid);
        setRooms((r) => ({
          ...r,
          [key]: [
            ...(r[key] || []),
            {
              id: `${data.senderUuid}-${Date.now()}-${Math.random()}`,
              from: data.from,
              me: data.senderUuid === myUuid,
              source: data.source,
              ...parseChatText(data.text),
            },
          ],
        }));
      }

      if (data.type === "presence") {
        setPresence((p) => ({ ...p, [data.uuid]: { online: data.online, afk: data.afk, zone: data.zone } }));
      }
    };

    // Sem isso, qualquer soluco de rede (trocar de wifi pra dados moveis,
    // o app voltar do segundo plano, o backend reiniciar) deixava o chat
    // mudo pro resto da sessao -- o unico jeito de voltar a funcionar era
    // fechar e abrir o app de novo. O backoff crescente (2s, 4s, 8s...) evita
    // martelar o servidor com tentativas se ele realmente cair por um tempo.
    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(`${WS_BASE_URL}/ws?kind=app&token=${encodeURIComponent(authToken)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setWsConnected(true);
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (cancelled) return;
        const delay = Math.min(30000, 2000 * 2 ** attempt);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => socket.close(); // onclose cuida da reconexao

      socket.onmessage = handleMessage;
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, authToken]);

  // Envia pro backend e já ecoa localmente — o backend nunca devolve pro
  // próprio remetente (evita eco/duplicata), então o otimista aqui é quem
  // faz a mensagem aparecer na hora pra quem mandou.
  const sendChat = (channel, scopeId, text) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ channel, scopeId: scopeId || null, text }));
    }
    // Se o socket nao estiver aberto (reconectando, por exemplo), a
    // mensagem nao sai -- ainda assim mostramos o eco local abaixo, pra
    // nao travar a digitação. Isso significa que, numa reconexao rara, a
    // mensagem pode aparecer só pro remetente e nao chegar a ninguem.
    // Aceitavel por enquanto; um "reenviar" ficaria pra uma proxima etapa.
    const key = roomKeyFor(channel, scopeId, myUuid, myUuid);
    setRooms((r) => ({
      ...r,
      [key]: [
        ...(r[key] || []),
        { id: `me-${Date.now()}`, from: nick, me: true, source: "app", ...parseChatText(text) },
      ],
    }));
  };

  // Grava de verdade (MediaRecorder no ChannelThread), sobe pro backend
  // (POST /app/media/upload) e manda pelo chat normal usando a convenção
  // "AUDIO::url::duração" — sendChat cuida do resto (broadcast + eco local).
  const sendAudio = async (channel, scopeId, base64Data, mimetype, seconds) => {
    const durationLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    try {
      const data = await apiFetch("/app/media/upload", {
        method: "POST",
        body: { data: base64Data, mimetype },
        token: authToken,
      });
      sendChat(channel, scopeId, `AUDIO::${API_BASE_URL}${data.path}::${durationLabel}`);
    } catch (err) {
      alert("Não foi possível enviar o áudio: " + err.message);
    }
  };

  // Mesma ideia do sendAudio, só que pra imagem — convenção "IMAGE::url".
  const sendImage = async (channel, scopeId, base64Data, mimetype) => {
    try {
      const data = await apiFetch("/app/media/upload", {
        method: "POST",
        body: { data: base64Data, mimetype },
        token: authToken,
      });
      sendChat(channel, scopeId, `IMAGE::${API_BASE_URL}${data.path}`);
    } catch (err) {
      alert("Não foi possível enviar a imagem: " + err.message);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#080B09] flex items-center justify-center py-8 px-4">
      <div className="w-[380px] h-[780px] bg-[#0F1712] rounded-[2.5rem] border-[6px] border-[#1A231C] shadow-2xl overflow-hidden flex flex-col">
        <PhoneChrome>
          {!linked ? (
            <LinkScreen
              onLinked={(n, tok) => {
                const uuid = decodeJwtPayload(tok).uuid || "";
                setNick(n);
                setAuthToken(tok);
                setMyUuid(uuid);
                setLinked(true);
                persistSession(n, tok, uuid);
              }}
            />
          ) : (
            <>
              <TopStatus
                nick={nick}
                role={role}
                onOpenConfig={() => setTab("config")}
                onOpenProfile={() => setTab("perfil")}
                authToken={authToken}
              />
              {tab === "home" && <HomeScreen nick={nick} setTab={setTab} authToken={authToken} />}
              {tab === "chat" && (
                <ChatScreen
                  space={chatSpace}
                  setSpace={setChatSpace}
                  rooms={rooms}
                  sendChat={sendChat}
                  sendAudio={sendAudio}
                  sendImage={sendImage}
                  myUuid={myUuid}
                  nick={nick}
                  authToken={authToken}
                  presence={presence}
                  friendsList={friendsList}
                />
              )}
              {tab === "amigos" && (
                <FriendsScreen
                  rooms={rooms}
                  sendChat={sendChat}
                  sendAudio={sendAudio}
                  sendImage={sendImage}
                  myUuid={myUuid}
                  presence={presence}
                  authToken={authToken}
                  friendsList={friendsList}
                  friendRequests={friendRequests}
                  refreshFriends={refreshFriends}
                />
              )}
              {tab === "loja" && <ShopScreen authToken={authToken} />}
              {tab === "atualizacoes" && <FeedScreen isStaff={isStaff} authToken={authToken} />}
              {tab === "sugestoes" && <SuggestionsScreen isStaff={isStaff} authToken={authToken} />}
              {tab === "perfil" && <ProfileScreen nick={nick} role={role} />}
              {tab === "pontos" && <PointsScreen authToken={authToken} />}
              {tab === "config" && <ConfigScreen setTab={setTab} onLogout={logout} />}
              <BottomNav tab={tab} setTab={setTab} chatSpace={chatSpace} />
            </>
          )}
        </PhoneChrome>
      </div>

      {linked && (
        <button
          onClick={() => setRoleIndex((i) => (i + 1) % ROLES.length)}
          className="fixed bottom-4 right-4 text-[10px] bg-[#1C2A20] border border-[#2A3B2E] text-[#8FA093] rounded-full px-3 py-1.5"
        >
          demo: cargo {role || "jogador"}
        </button>
      )}
    </div>
  );
}
