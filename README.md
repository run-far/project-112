# StrideHQ

**Every run teaches you something.**

StrideHQ ist ein persönliches Athlete Operating System mit Morning Briefing, Mission Control, Strava-Import, Workout Reviews, Coach Engine, Equipment Intelligence und Fuel/Hydration Intelligence.

## Enthaltene Milestones

1. Rebranding zu StrideHQ
2. Responsive Navigation und Routing
3. Strava OAuth + Aktivitäten-Import
4. Workout Review inkl. Trinkmenge, Gewicht, Beine, Energie, Magen und RPE
5. Morning Briefing mit Recap und Vorausschau
6. Regelbasierte Coach Engine
7. Equipment Intelligence
8. Fuel- und Hydration Intelligence

## Frontend starten

```bash
cd project112-app
npm install
cp .env.example .env
npm run dev
```

Ohne Strava-Konfiguration startet die App mit Demodaten. Alle Reviews und Änderungen werden lokal im Browser gespeichert.

## Strava-Backend starten

Der `STRAVA_CLIENT_SECRET` darf niemals in GitHub Pages oder im React-Frontend liegen. Deshalb ist ein kleines Backend enthalten.

```bash
cd stridehq-server
npm install
cp .env.example .env
npm run dev
```

Danach im Frontend `.env` setzen:

```env
VITE_STRAVA_CLIENT_ID=DEINE_CLIENT_ID
VITE_STRAVA_REDIRECT_URI=http://localhost:5173/project-112/settings
VITE_API_BASE_URL=http://localhost:8787
```

In der Strava-App muss die Authorization Callback Domain für lokal auf `localhost` gesetzt sein. Für GitHub Pages muss das Backend separat gehostet werden, zum Beispiel auf Render, Railway oder Fly.io. Danach `VITE_API_BASE_URL` auf dessen HTTPS-Adresse setzen.

## Build

```bash
cd project112-app
npm run build
```

## GitHub Pages

Die bestehende Base-URL `/project-112/` bleibt erhalten. Deployment:

```bash
npm run deploy
```

## Hinweis zum aktuellen Strava-Stand

Der OAuth-Flow und API-Import sind implementiert. Für einen echten Test werden deine eigene Strava Client-ID, dein Client Secret und ein laufendes Backend benötigt. Tokens werden im aktuellen MVP lokal im Browser gespeichert. Für einen Mehrbenutzerbetrieb gehören Tokens verschlüsselt in eine Datenbank im Backend.
