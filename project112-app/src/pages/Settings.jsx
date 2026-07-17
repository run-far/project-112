import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";
import { connectStrava, exchangeCode, fetchActivities, mapRunningActivities } from "../services/strava";
import { downloadCalendar, publicCalendarUrl, syncCalendar } from "../services/calendar";
import { resetState } from "../services/storage";
import { mergeGarminActivities, readGarminExport } from "../services/garminImport";

export default function Settings() {
  const { state, setState } = useApp();
  const [message, setMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [garminBusy, setGarminBusy] = useState(false);
  const [garminPreview, setGarminPreview] = useState(null);
  const [garminMessage, setGarminMessage] = useState("");
  const garminInput = useRef(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    if (oauthError) {
      // OAuth callback is handled once on page load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("Strava-Verbindung wurde abgebrochen.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (!code || exchangeStarted.current) return;
    exchangeStarted.current = true;
    setBusy(true);
    setMessage("Strava wird verbunden und deine Läufe werden geladen …");
    async function finishConnection() {
      try {
        const tokenData = await exchangeCode(code);
        const rawActivities = await fetchActivities(tokenData.access_token);
        const runningActivities = mapRunningActivities(rawActivities);
        setState((current) => {
          const garminActivities = current.activities.filter((activity) => activity.source === "garmin");
          const merged = mergeGarminActivities(runningActivities, garminActivities);
          return {
            ...current,
            activities: merged.activities,
            strava: { ...current.strava, connected: true, athlete: tokenData.athlete || null, token: tokenData.access_token, refreshToken: tokenData.refresh_token || null, expiresAt: tokenData.expires_at || null, lastSyncAt: new Date().toISOString() },
          };
        });
        setMessage(`${runningActivities.length} Läufe seit 01.01.2025 aus Strava geladen.`);
        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally { setBusy(false); }
    }
    finishConnection();
  }, [setState]);

  function connect() {
    try { setMessage(""); connectStrava(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }


  async function previewGarmin(file) {
    if (!file) return;
    setGarminBusy(true);
    setGarminPreview(null);
    setGarminMessage("Garmin-Export wird gelesen … Das kann bei der großen ZIP kurz dauern.");
    try {
      const preview = await readGarminExport(file, state.garmin?.importFrom || "2025-01-01");
      setGarminPreview(preview);
      setGarminMessage(`${preview.total} Aktivitäten vom ${preview.firstDate} bis ${preview.lastDate} gefunden.`);
    } catch (error) {
      setGarminMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setGarminBusy(false);
      if (garminInput.current) garminInput.current.value = "";
    }
  }

  function importGarmin() {
    if (!garminPreview) return;
    const merged = mergeGarminActivities(state.activities, garminPreview.activities);
    setState((current) => ({
      ...current,
      activities: merged.activities,
      garmin: {
        ...current.garmin,
        lastImportAt: new Date().toISOString(),
        fileName: garminPreview.fileName,
        imported: merged.added,
        duplicates: merged.duplicates,
      },
    }));
    setGarminMessage(`${merged.added} Aktivitäten importiert, ${merged.duplicates} Duplikate mit vorhandenen Daten zusammengeführt.`);
    setGarminPreview(null);
  }

  async function publishCalendar() {
    setCalendarMessage("Kalender wird aktualisiert …");
    try {
      const result = await syncCalendar(state.calendar.id, state.plan);
      setState((current) => ({ ...current, calendar: { ...current.calendar, lastSyncAt: result.updatedAt } }));
      setCalendarMessage(result.mode === "download" ? `${result.count} Termine als stridehq.ics erstellt. Datei anschließend unter calendar/stridehq.ics ersetzen und zu GitHub pushen.` : `${result.count} Termine veröffentlicht.`);
    } catch (error) { setCalendarMessage(error instanceof Error ? error.message : String(error)); }
  }

  const athleteName = [state.strava.athlete?.firstname, state.strava.athlete?.lastname].filter(Boolean).join(" ");
  const calendarUrl = publicCalendarUrl;

  return <>
    <PageTitle eyebrow="Settings" title="Verbindungen & Daten" />
    <div className="grid">
      <Card>
        <p className="eyebrow">Strava</p><h2>{state.strava.connected ? "Verbunden" : "Nicht verbunden"}</h2>
        <p className="muted">{state.strava.connected ? `${athleteName ? `Verbunden mit ${athleteName}. ` : ""}Deine Laufaktivitäten können synchronisiert werden.` : "Verbinde Strava, damit deine Laufaktivitäten automatisch in StrideHQ erscheinen."}</p>
        <button className="strava" onClick={connect} disabled={busy}>{busy ? "Strava wird verbunden …" : state.strava.connected ? "Neu verbinden" : "Connect with Strava"}</button>
        {message && <p className="connection-message">{message}</p>}
      </Card>


      <Card className="wide">
        <p className="eyebrow">Garmin</p><h2>Garmin-Export importieren</h2>
        <p className="muted">Liest den vollständigen Garmin-Datenexport direkt im Browser. Importiert werden alle Aktivitäten ab 01.01.2025; vorhandene Strava-Aktivitäten werden als Duplikate erkannt und ergänzt.</p>
        <input
          ref={garminInput}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          hidden
          onChange={(event) => previewGarmin(event.target.files?.[0])}
        />
        <div className="button-row">
          <button onClick={() => garminInput.current?.click()} disabled={garminBusy}>
            {garminBusy ? "Export wird geprüft …" : "Garmin ZIP auswählen"}
          </button>
          {garminPreview && <button className="secondary" onClick={importGarmin}>Import starten</button>}
        </div>
        {garminPreview && (
          <div className="import-preview">
            <div><span>Aktivitäten</span><strong>{garminPreview.total}</strong></div>
            <div><span>Läufe</span><strong>{garminPreview.runs}</strong></div>
            <div><span>Laufkilometer</span><strong>{garminPreview.distance.toFixed(1)} km</strong></div>
            <div><span>Zeitraum</span><strong>{garminPreview.firstDate} – {garminPreview.lastDate}</strong></div>
            <p className="muted import-types">{Object.entries(garminPreview.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => `${type}: ${count}`).join(" · ")}</p>
          </div>
        )}
        {state.garmin?.lastImportAt && <p className="muted">Letzter Import: {new Date(state.garmin.lastImportAt).toLocaleString("de-DE")} · {state.garmin.imported} neu · {state.garmin.duplicates} Duplikate</p>}
        {garminMessage && <p className="connection-message">{garminMessage}</p>}
      </Card>

      <Card>
        <p className="eyebrow">Apple Kalender</p><h2>Kalender-Abo</h2>
        <p className="muted">Veröffentlicht die aktuelle Trainingswoche als abonnierbaren ICS-Kalender.</p>
        <div className="button-row">
          <button onClick={publishCalendar}>ICS erzeugen</button>
          <button className="secondary" onClick={() => downloadCalendar(state.plan)}>Erneut herunterladen</button>
        </div>
        {calendarUrl && <><label className="calendar-url-label">Abo-Adresse<input readOnly value={calendarUrl} onFocus={(event) => event.target.select()} /></label><p className="muted">Die heruntergeladene Datei als <b>calendar/stridehq.ics</b> in das Repository kopieren, committen und pushen. Das iPhone-Kalenderabo aktualisiert danach automatisch dieselbe Adresse.</p><p className="muted">Auf dem iPhone: Kalender → Kalender hinzufügen → Kalenderabonnement hinzufügen → Adresse einsetzen.</p></>}
        {calendarMessage && <p className="connection-message">{calendarMessage}</p>}
      </Card>

      <Card>
        <p className="eyebrow">Lokale Daten</p><h2>Reset</h2><p className="muted">Entfernt Reviews, importierte Aktivitäten und lokale Einstellungen aus diesem Browser.</p><button onClick={resetState}>Daten zurücksetzen</button>
      </Card>
    </div>
  </>;
}
