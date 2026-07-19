ENDURANCE INTELLIGENCE V2.0
===========================

Neu in V2:
- Wochenplan bestätigen und an Intervals.icu senden
- Strukturierte Lauf- und Radeinheiten werden als Workouts angelegt
- Fußball, Stabi, Mobility, Rudern und Ruhetage bleiben reine Kalendereinträge
- Vorhandene Intervals-Einträge werden aktualisiert, entfernte Einheiten bereinigt
- Änderungswarnung, wenn ein bereits gesendeter Wochenplan später angepasst wurde
- Fuel-Bestand wird ab einem klaren Startdatum geführt
- Historische bzw. bereits verbrauchte Gels können im Review erfasst werden, ohne den heutigen Bestand zu reduzieren

INSTALLATION
1. ZIP über C:\work\GitProject\project-112 entpacken und Dateien ersetzen.
2. Frontend prüfen:
   cd C:\work\GitProject\project-112\project112-app
   npm install
   npm run lint
   npm run build
   npm run dev
3. Intervals Edge Function veröffentlichen:
   cd C:\work\GitProject\project-112
   supabase functions deploy intervals
4. In Intervals.icu:
   Settings -> Garmin -> Upload planned workouts aktivieren.
5. In Endurance Intelligence:
   Wochenplan -> Woche bestätigen & an Garmin senden.

HINWEIS ZUM FUEL-BESTAND
Produkte ohne bisheriges Bestandsstartdatum erhalten beim ersten Start von V2 automatisch das aktuelle Datum.
Reviews für frühere Aktivitäten werden standardmäßig als historischer Verbrauch behandelt und ziehen nichts vom heutigen Bestand ab. Falls V1.5 bei solchen Reviews bereits Bestand abgezogen hat, stellt V2 diesen bei der ersten Datenmigration automatisch wieder her.
Der Schalter "Aktuellen Bestand reduzieren" kann je Verpflegungseintrag geändert werden.
