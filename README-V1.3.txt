ENDURANCE INTELLIGENCE v1.3
Eat your miles.

Enthalten:
- Intervals.icu als primäre automatische Garmin-Datenquelle
- Strava bleibt optional
- Duplikaterkennung über Quellen-ID sowie Sportart, Startzeit, Distanz und Dauer
- Erste Intervals-Synchronisierung ab 01.01.2025, danach nur neue/geänderte Tage mit Sicherheitsüberlappung
- Eigene Aktivitätsnamen, die bei späteren Synchronisierungen erhalten bleiben
- Aktualisierte Garmin-Namen werden übernommen, solange kein eigener Name gesetzt wurde
- Endurance-Intelligence-Branding
- v1.2 Review-Erweiterungen und sicherer Strava-OAuth über Supabase

INSTALLATION
1. ZIP direkt über C:\work\GitProject\project-112 entpacken und Dateien ersetzen.
2. Frontend prüfen:
   cd C:\work\GitProject\project-112\project112-app
   npm run lint
   npm run build
   npm run dev
3. Intervals-Funktion veröffentlichen:
   cd C:\work\GitProject\project-112
   supabase link --project-ref kxuwbjkyjngcgpkqopnh
   supabase functions deploy intervals
4. Falls v1.2 noch nicht veröffentlicht wurde:
   supabase db push
   supabase functions deploy strava
   supabase functions deploy calendar --no-verify-jwt
5. In der App:
   Settings > Intervals.icu > Verbindung prüfen > Jetzt synchronisieren

HINWEIS
INTERVALS_API_KEY bleibt ausschließlich als Supabase Secret gespeichert. Die Funktion nutzt /athlete/0, also automatisch den Athleten des API-Keys. INTERVALS_ATHLETE_ID darf gesetzt bleiben, wird aber nicht benötigt.
