STRIDEHQ – STRAVA ACTIVITIES SPRINT

1. Kopiere die Ordner project112-app und stridehq-server über dein bestehendes Projekt.
   Vorhandene Dateien ersetzen.

2. Deine echten .env-Dateien NICHT überschreiben. Die ZIP enthält nur .env.example.

3. Backend neu starten:
   cd stridehq-server
   npm run dev

4. Frontend neu starten:
   cd project112-app
   npm run dev

5. Öffnen:
   http://localhost:5173/project-112/training

6. Auf "Strava synchronisieren" klicken.

Enthalten:
- Echte Strava-Läufe laden
- Run, TrailRun und VirtualRun filtern
- Distanz, Dauer, Pace, Höhenmeter und Puls anzeigen
- Manueller Sync-Button
- Lade- und Fehlermeldungen
- Letzten Sync anzeigen
- Bestehende Reviews bleiben erhalten
