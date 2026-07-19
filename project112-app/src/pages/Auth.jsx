import { useState } from "react";
import { signIn, signUp } from "../services/supabase";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        const result = await signUp(email.trim(), password);
        setMessage(result.session ? "Konto erstellt. Du bist angemeldet." : "Konto erstellt. Bitte bestätige jetzt die E-Mail und melde dich danach an.");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">StrideHQ Cloud</p>
        <h1>Every run teaches you something.</h1>
        <p className="muted">Melde dich an, damit Aktivitäten, Wochenplan und Einstellungen auf all deinen Geräten identisch sind.</p>
        <form onSubmit={submit} className="auth-form">
          <label>E-Mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Passwort<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="primary" disabled={busy}>{busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Konto erstellen"}</button>
        </form>
        {message && <p className="connection-message">{message}</p>}
        <button className="auth-switch" onClick={() => { setMode((current) => current === "login" ? "register" : "login"); setMessage(""); }}>
          {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon registriert? Anmelden"}
        </button>
      </section>
    </main>
  );
}
