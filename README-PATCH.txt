StrideHQ Sprint 1 Patch

1. Inhalt dieses ZIPs in das Stammverzeichnis von project-112 kopieren.
2. Vorhandene Dateien ersetzen.
3. Backend neu starten:
   cd stridehq-server
   npm start
4. Frontend neu starten:
   cd project112-app
   npm run dev
5. Unter Settings Strava neu verbinden oder unter Training synchronisieren.

Enthalten:
- Keine Demo-Aktivitäten, Demo-Ausrüstung oder Demo-Fuel-Daten mehr
- automatische Migration von stridehq.v1 auf stridehq.v2
- kompletter Strava-Import ab 01.01.2025 mit Pagination
- echte Wochenkilometer und wirklich letzter Lauf
- Jahresvergleich 2025/2026
- Equipment für Schuhe, Laufband, Rudergerät und weitere Kategorien
- Week Planner mit Uhrzeit sowie Pflicht/Optional

Geprüft:
- Frontend npm run build erfolgreich
- Frontend npm run lint erfolgreich
- Backend node --check erfolgreich
