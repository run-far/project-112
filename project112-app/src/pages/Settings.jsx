import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";
import {
  connectStrava,
  exchangeCode,
  fetchActivities,
  mapRunningActivities,
} from "../services/strava";
import { resetState } from "../services/storage";

export default function Settings() {
  const { state, setState } = useApp();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");

    if (oauthError) {
      setMessage("Strava-Verbindung wurde abgebrochen.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!code || exchangeStarted.current) {
      return;
    }

    exchangeStarted.current = true;
    setBusy(true);
    setMessage("Strava wird verbunden und deine Läufe werden geladen …");

    async function finishConnection() {
      try {
        const tokenData = await exchangeCode(code);
        const rawActivities = await fetchActivities(tokenData.access_token);
        const runningActivities = mapRunningActivities(rawActivities);

        setState((current) => ({
          ...current,
          activities: runningActivities,
          strava: {
            connected: true,
            athlete: tokenData.athlete || null,
            token: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            expiresAt: tokenData.expires_at || null,
            lastSyncAt: new Date().toISOString(),
          },
        }));

        setMessage(
          `${runningActivities.length} Lauf${runningActivities.length === 1 ? "" : "e"} aus Strava geladen.`,
        );
        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    }

    finishConnection();
  }, [setState]);

  function connect() {
    try {
      setMessage("");
      connectStrava();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const athleteName = [state.strava.athlete?.firstname, state.strava.athlete?.lastname]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageTitle eyebrow="Settings" title="Verbindungen & Daten" />

      <div className="grid">
        <Card>
          <p className="eyebrow">Strava</p>
          <h2>{state.strava.connected ? "Verbunden" : "Nicht verbunden"}</h2>

          {state.strava.connected ? (
            <p className="muted">
              {athleteName ? `Verbunden mit ${athleteName}. ` : ""}
              Deine echten Laufaktivitäten können jetzt synchronisiert werden.
            </p>
          ) : (
            <p className="muted">
              Verbinde Strava, damit deine Laufaktivitäten automatisch in StrideHQ erscheinen.
            </p>
          )}

          <button className="strava" onClick={connect} disabled={busy}>
            {busy
              ? "Strava wird verbunden …"
              : state.strava.connected
                ? "Neu verbinden"
                : "Connect with Strava"}
          </button>

          {message && <p className="connection-message">{message}</p>}
        </Card>

        <Card>
          <p className="eyebrow">Lokale Daten</p>
          <h2>Reset</h2>
          <p className="muted">
            Entfernt Reviews, importierte Aktivitäten und lokale Einstellungen aus diesem Browser.
          </p>
          <button onClick={resetState}>Daten zurücksetzen</button>
        </Card>
      </div>
    </>
  );
}
