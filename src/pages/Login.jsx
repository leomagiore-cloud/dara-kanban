import React, { useState } from "react";
import "./login.css";
import { useAuth, traduzErro } from "../lib/auth";

/* ============================================================
   AUTH — login, cadastro, esqueci a senha, redefinir senha,
   aguardando aprovação. Tudo na mesma tela (vídeo de fundo).
   modes: login | register | forgot | reset | pending
   ============================================================ */

const MIN_PASS = 8;

export default function Login({ forceMode }) {
  const { signIn, signUp, sendResetEmail, updatePassword, signOut, cancelRecovery, profile, refreshProfile } =
    useAuth();

  const [mode, setMode] = useState(forceMode || "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const current = forceMode || mode;

  function go(next) {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    try {
      setLoading(true);

      if (current === "login") {
        if (!email.trim() || !password) return setError("Preencha e-mail e senha.");
        const { error } = await signIn(email, password);
        if (error) setError(traduzErro(error));
        // sucesso: o AuthProvider atualiza a sessão e o App troca de tela
      }

      if (current === "register") {
        if (!name.trim() || !email.trim() || !password) return setError("Preencha todos os campos.");
        if (password.length < MIN_PASS) return setError(`A senha precisa ter pelo menos ${MIN_PASS} caracteres.`);
        if (password !== confirm) return setError("As senhas não conferem.");
        const { data, error } = await signUp(name, email, password);
        if (error) return setError(traduzErro(error));
        // E-mail já existente: o Supabase devolve user sem identities (não revela se existe)
        if (data.user && data.user.identities?.length === 0) {
          return setError("Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.");
        }
        if (!data.session) {
          // confirmação de e-mail ligada
          setInfo("Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, um administrador precisa liberar seu acesso.");
          setMode("login");
          setPassword("");
          setConfirm("");
        }
        // se vier sessão (confirmação desligada), o App mostra "aguardando aprovação"
      }

      if (current === "forgot") {
        if (!email.trim()) return setError("Informe seu e-mail.");
        const { error } = await sendResetEmail(email);
        if (error) return setError(traduzErro(error));
        // mensagem genérica de propósito (não revela se o e-mail existe)
        setInfo("Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.");
      }

      if (current === "reset") {
        if (password.length < MIN_PASS) return setError(`A senha precisa ter pelo menos ${MIN_PASS} caracteres.`);
        if (password !== confirm) return setError("As senhas não conferem.");
        const { error } = await updatePassword(password);
        if (error) return setError(traduzErro(error));
        // recovery=false → App segue para o sistema (ou "aguardando aprovação")
      }
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: ["Bem-vindo de volta", "Acesse com suas credenciais Dara."],
    register: ["Criar conta", "Cadastre-se para acessar o sistema da equipe."],
    forgot: ["Esqueceu a senha?", "Enviaremos um link de redefinição para o seu e-mail."],
    reset: ["Nova senha", "Escolha uma nova senha para a sua conta."],
    pending: ["Aguardando aprovação", "Seu cadastro foi recebido."],
  };
  const [title, subtitle] = titles[current];

  return (
    <div className="login-wrap">
      <video className="login-video" src="/dara-login.mp4" autoPlay loop muted playsInline />
      <div className="login-video-overlay" />
      <div className="login-video-vignette" />
      <div className="login-video-grain" />

      <div className="login-content">
        <div className="login-hero">
          <div className="login-hero-logo">
            <span className="login-hero-brand">DARA</span>
            <span className="login-hero-brand-sub">AUDIOVISUAL</span>
          </div>
          <h1 className="login-headline">
            Produção audiovisual <em>sem atrito</em>.
          </h1>
          <p className="login-sub">
            Centralize gravações, edições e entregas em um fluxo só. Sua equipe pega, edita e entrega — tudo em um
            lugar.
          </p>
        </div>

        <form className="login-panel" onSubmit={handleSubmit} noValidate>
          <div className="login-form-logo">
            <span className="login-hero-brand">DARA</span>
            <span className="login-hero-brand-sub">AUDIOVISUAL</span>
          </div>

          <h2 className="login-form-title">{title}</h2>
          <p className="login-form-sub">{subtitle}</p>

          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-success">{info}</div>}

          {current === "pending" && (
            <>
              <div className="login-success">
                Olá{profile?.name ? `, ${profile.name}` : ""}! Um administrador precisa liberar o seu acesso. Assim que
                for aprovado, você poderá entrar normalmente.
              </div>
              <button type="button" className="btn btn-primary login-btn" onClick={refreshProfile}>
                Já fui aprovado — verificar
              </button>
              <button type="button" className="login-link" onClick={signOut}>
                Sair
              </button>
            </>
          )}

          {current === "register" && (
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" type="text" autoComplete="name" placeholder="Seu nome" value={name}
                onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
          )}

          {["login", "register", "forgot"].includes(current) && (
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" placeholder="voce@dara.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoFocus={current !== "register"} />
            </div>
          )}

          {["login", "register", "reset"].includes(current) && (
            <div className="field">
              <label htmlFor="password">{current === "reset" ? "Nova senha" : "Senha"}</label>
              <input id="password" type="password"
                autoComplete={current === "login" ? "current-password" : "new-password"}
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                autoFocus={current === "reset"} />
            </div>
          )}

          {["register", "reset"].includes(current) && (
            <div className="field">
              <label htmlFor="confirm">Confirmar senha</label>
              <input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          )}

          {current !== "pending" && (
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading
                ? "Aguarde…"
                : { login: "Entrar", register: "Criar conta", forgot: "Enviar link", reset: "Salvar nova senha" }[current]}
            </button>
          )}

          {current === "login" && (
            <div className="login-links">
              <button type="button" className="login-link" onClick={() => go("forgot")}>Esqueci minha senha</button>
              <button type="button" className="login-link" onClick={() => go("register")}>Criar conta</button>
            </div>
          )}
          {(current === "register" || current === "forgot") && (
            <div className="login-links">
              <button type="button" className="login-link" onClick={() => go("login")}>← Voltar para o login</button>
            </div>
          )}
          {current === "reset" && (
            <div className="login-links">
              <button type="button" className="login-link" onClick={() => { cancelRecovery(); signOut(); }}>Cancelar</button>
            </div>
          )}
        </form>

        <div className="login-foot">
          © {new Date().getFullYear()} Dara Audiovisual · Desenvolvido por{" "}
          <a href="https://instagram.com/magiore.br" target="_blank" rel="noreferrer">@magiore.br</a>
        </div>
      </div>
    </div>
  );
}
