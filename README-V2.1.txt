ENDURANCE INTELLIGENCE V2.1
===========================

Voraussetzung:
- V1.5 und V2.0 wurden bereits eingespielt.
- Intervals.icu und Supabase sind verbunden.

Enthalten:
- Responsive Optimierung für Handy und Desktop
- Training: mobile Karten und aufgeräumte Aktionsbuttons
- Wochenplan: mobile Buttons und bessere Einheitenaktionen
- Equipment/Fuel/Mission: Page-Buttons auf dem Handy vollständig sichtbar
- Mission Control: Hauptziel nur noch einmal als kombinierte Zielkarte
- Meilenstein/Event-Formular nur noch über den oberen Button
- Kalender als ganztägige Einträge ohne Uhrzeit
- Keine Präfixe wie "Endurance Intelligence –" in Terminnamen
- Kalender-Symbole für Fixtermine, Schlüsseleinheiten, Recovery und Alternativen
- Fixtermin-Check vor intelligenter Planung
- Samstag: ORC Track, Alternativlauf, offen als Entweder/Oder oder frei
- Offene Samstagswahl kann später direkt im Wochenplan entschieden werden
- Wetter am Aktivitätszeitpunkt über Intervals.icu bzw. Open-Meteo
- Kohlenhydrate gesamt und pro Stunde in Lauf-/Rennrad-Reviews
- Einordnung gegen einen dauerabhängigen Orientierungsbereich
- Strava-Aktivitäten werden bei aktiver Intervals-Verbindung aus Training und Planner ausgeblendet

Installation:
1. ZIP über C:\work\GitProject\project-112 entpacken und Dateien ersetzen.
2. Frontend prüfen:

   cd C:\work\GitProject\project-112\project112-app
   npm install
   npm run lint
   npm run build
   npm run dev

3. Supabase-Funktionen aktualisieren:

   cd C:\work\GitProject\project-112
   supabase functions deploy intervals
   supabase functions deploy calendar --no-verify-jwt

4. Veröffentlichen:

   git add .
   git commit -m "Release Endurance Intelligence v2.1"
   git push origin main

Hinweis Wetter:
Wetterdaten werden beim Öffnen einer Review nachgeladen, wenn Startkoordinaten vorhanden sind. So werden nicht hunderte alte Aktivitäten gleichzeitig gegen eine Wetter-API abgefragt.
