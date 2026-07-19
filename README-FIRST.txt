STRIDEHQ v1.1 – CLEAN OVERLAY
==============================

Warum die letzte Änderung kaum sichtbar war:
Der letzte Commit im hochgeladenen Repository änderte nur den Workflow,
den alten Strava-Server und die Kalenderfunktion. Die angekündigten Dateien
für Planner, Training, Achievements und Coach waren im Repository nicht aktiv.

Anwendung:
1. ZIP in einen beliebigen Ordner entpacken.
2. PowerShell in diesem Ordner öffnen.
3. Ausführen:

   powershell -ExecutionPolicy Bypass -File .\APPLY-STRIDEHQ-V1.1.ps1

4. Danach:

   cd C:\work\GitProject\project-112\project112-app
   npm run dev

Sichtbare Prüfpunkte:
- Links steht „Eat your miles.“ und die Version v1.1.
- Mission zeigt „Fulda-Vorbereitung“ und Achievements.
- Training ist nach Monat und Kalenderwoche gruppiert.
- Coach fordert nur Reviews des aktuellen Monats.
- Wochenplan zeigt „Mission → Historie → 3:1-Zyklus → Befinden → Wetter“.
- Beim intelligenten Planen gibt es kein manuelles Wochen-km-Ziel mehr.
- Müdigkeit, Schmerzen und Krankheit sind getrennte Rückmeldungen.
- Strava-Live-Sync ist standardmäßig deaktiviert; Garmin ist primär.

Optional danach einmal ausführen:

   powershell -ExecutionPolicy Bypass -File .\CLEANUP-REPOSITORY.ps1

Das entfernt node_modules und .env nur aus der Git-Verfolgung, nicht vom Rechner.
