StrideHQ Garmin Import Patch

Enthalten:
- Garmin-Komplettexport als ZIP oder summarizedActivities.json einlesen
- Import aller Aktivitäten ab 01.01.2025
- Vorschau mit Zeitraum, Aktivitätszahl, Läufen und Laufkilometern
- Duplikaterkennung zwischen Garmin und Strava
- Wiederholter Garmin-Import erzeugt keine Duplikate
- Garmin-Daten bleiben bei einer erneuten Strava-Synchronisierung erhalten
- 332 Aktivitäten aus dem bereitgestellten Export erfolgreich getestet

Installation:
1. ZIP in das Root-Verzeichnis des project-112 Repositorys entpacken und Dateien ersetzen.
2. cd project112-app
3. npm install
4. npm run dev
5. In StrideHQ: Settings -> Garmin -> Garmin ZIP auswählen -> Import starten
