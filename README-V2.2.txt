ENDURANCE INTELLIGENCE v2.2
===========================

Enthalten:
- Wochenplan-Dialog auf dem Handy fixiert; kein horizontales Verschieben mehr
- Klare Unterscheidung: Kombi-Tag (Stabi/Mobility + Lauf) vs. echtes Doppeltraining
- Adaptive Belastungssteuerung mit 3:1 als Grundgerüst, nicht als starre Regel
- Briefing zeigt Montag bis Sonntag vollständig; freie Tage erscheinen als Erholungstag
- Ausrüstung aus Intervals.icu importieren
- Fotos für Equipment hinzufügen/ändern
- Vorhandene Kilometer beim manuellen Anlegen von Schuhen, Fahrrad und Laufband übernehmen
- Intervals-Gear-ID an Aktivitäten übernehmen, sofern vorhanden

Installation:
1. ZIP über C:\work\GitProject\project-112 entpacken und Dateien ersetzen.
2. Frontend testen:
   cd C:\work\GitProject\project-112\project112-app
   npm install
   npm run lint
   npm run build
   npm run dev
3. Intervals Edge Function aktualisieren:
   cd C:\work\GitProject\project-112
   supabase functions deploy intervals

Hinweis zur Ausrüstung:
Intervals.icu kann seine eigene Gear-Liste liefern. Garmin-Schuhzuordnungen werden jedoch nicht in jedem Fall von Garmin an Intervals.icu übertragen. Ein Geräte-Name wie Forerunner ist kein Schuh, sondern das Aufzeichnungsgerät.

Hinweis zur Fotoerkennung:
Fotos werden komprimiert und in deinem Cloud-Datensatz gespeichert. Die exakte automatische Erkennung von Marke und Modell ist noch nicht aktiv, da dafür ein zusätzlicher Vision-Dienst samt API-Key nötig wäre.
