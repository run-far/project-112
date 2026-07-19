ENDURANCE INTELLIGENCE v1.4 – PRE-PUBLISH PATCH
================================================

Enthalten:
- Intervals.icu hat Vorrang vor Strava/Garmin bei identischen Aktivitäten.
- Doppelte Strava-Einträge verschwinden aus Training, Wochenplan, Coach, Mission und Analytics.
- Einzigartige Strava-Aktivitäten bleiben als optionale Rückfallquelle erhalten.
- Intervals-Sync führt erkannte Zwillinge zusammen und behält bestehende Review-/Plan-IDs.
- Reviews nur noch für Laufen, erkanntes Rennrad, Rudern, Stabi und Mobility.
- Fußball, Wandern, normales Radfahren und sonstige Einheiten brauchen kein Review.
- Eigener Review-Typ für Rudern/Stabi/Mobility mit Oberkörper-Muskelkater, Rücken/Nacken,
  Beweglichkeit, Energie, Anstrengung und Einfluss auf das Laufen.
- Dynamischer Coach berücksichtigt Reviews der letzten 14 Tage, hohe HF-Zonen bei lockeren
  Läufen, RPE, Energie/Beine und Oberkörper-/Rückenbelastung.
- Aktuelle Woche wird vor einer erneuten intelligenten Planung ausdrücklich geschützt.
  Vergangene, erledigte, manuelle und mit Rückmeldung versehene Einheiten bleiben erhalten.
- Intervals-Verbindungstest aus v1.3.1 ist enthalten.

INSTALLATION
------------
ZIP-Inhalt direkt über C:\work\GitProject\project-112 entpacken und Dateien ersetzen.

Dann:
  cd C:\work\GitProject\project-112\project112-app
  npm run lint
  npm run build
  npm run dev

Intervals-Funktion aktualisieren:
  cd C:\work\GitProject\project-112
  supabase functions deploy intervals

Danach in der App einmal:
  Settings -> Intervals.icu -> Jetzt synchronisieren

Dadurch werden bereits vorhandene Strava/Intervals-Zwillinge auch im gespeicherten Datenbestand
zusammengeführt. Manuell vergebene Aktivitätsnamen bleiben erhalten.

VERÖFFENTLICHEN
---------------
  git add .
  git commit -m "Release Endurance Intelligence v1.4"
  git push origin main
