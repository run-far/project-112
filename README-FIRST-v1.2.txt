STRIDEHQ v1.2 – STRAVA, PRIVATER MODUS UND WORKOUT REVIEW
=========================================================

INHALT
------
- Strava OAuth und Sync laufen über eine Supabase Edge Function.
- Kein localhost-Callback mehr auf Handy/GitHub Pages.
- Strava-Tokens und Client Secret bleiben serverseitig.
- Neue Aktivitäten werden beim Öffnen der App automatisch synchronisiert.
- Für bis zu 20 neue Herzfrequenz-Aktivitäten pro Sync werden HR-Streams geladen
  und anhand deiner Strava-Herzfrequenzzonen ausgewertet.
- Registrierung ist im Frontend deaktiviert.
- Workout Review: Verpflegung mit Art, Hersteller, Produkt, Menge und Einheit.
- Größerer Event-Bereich; Eventname bleibt bearbeitbar und wird beim Aktivieren
  automatisch mit dem Aktivitätsnamen vorbelegt.

1. PATCH EINSETPZEN
-------------------
Den kompletten Inhalt dieser ZIP über folgenden Ordner entpacken und vorhandene
Dateien ersetzen:

C:\work\GitProject\project-112

Danach:

cd C:\work\GitProject\project-112\project112-app
npm install
npm run lint
npm run build
npm run dev

2. SUPABASE CLI UND PROJEKT
---------------------------
Im Repository-Hauptordner:

cd C:\work\GitProject\project-112
supabase login
supabase link --project-ref kxuwbjkyjngcgpkqopnh
supabase db push

Alternativ kann der Inhalt von
supabase\migrations\20260719090000_strava_connections.sql
im Supabase SQL Editor ausgeführt werden.

3. STRAVA SECRET ROTIEREN
-------------------------
Falls ein Client Secret jemals in GitHub/.env veröffentlicht war, im Strava
Developer Dashboard unbedingt ein neues Secret erzeugen. Das Secret niemals
in VITE_ Variablen, GitHub oder den Browser schreiben.

Danach die drei Edge-Function-Secrets setzen. Werte selbst einsetzen:

supabase secrets set STRAVA_CLIENT_ID="DEINE_CLIENT_ID" STRAVA_CLIENT_SECRET="DEIN_NEUES_SECRET" STRAVA_STATE_SECRET="EIN_LANGER_ZUFAELLIGER_WERT"

Einen zufälligen State-Wert kannst du in PowerShell erzeugen:

([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))

4. STRAVA CALLBACK DOMAIN
-------------------------
Im Strava Developer Dashboard unter My API Application:

Authorization Callback Domain:
run-far.github.io

Die App verwendet danach diesen Callback:
https://run-far.github.io/project-112/?connection=strava

5. STRAVA FUNCTION VERÖFFENTLICHEN
----------------------------------

cd C:\work\GitProject\project-112
supabase functions deploy strava

Danach StrideHQ öffnen:
Settings -> Strava -> Neu verbinden

Wegen des zusätzlichen Scopes profile:read_all bitte auch eine alte Verbindung
noch einmal über "Neu verbinden" autorisieren. Dieser Scope wird benötigt, um
deine Herzfrequenzzonen zu lesen. Die eigentliche Zeit in den Zonen berechnet
StrideHQ aus dem Herzfrequenzstream; der kostenpflichtige Activity-Zones-Endpunkt
wird dafür nicht verwendet.

6. APP WIRKLICH PRIVAT SCHALTEN
-------------------------------
VITE_ALLOW_SIGNUP=false blendet die Registrierung nur in der Oberfläche aus.
Zusätzlich zwingend im Supabase Dashboard:

Authentication -> General Configuration
-> Allow new users to sign up: AUS

Danach können nur bereits vorhandene Konten einloggen. Die Daten in
stridehq_data sind außerdem per Row Level Security an die jeweilige user_id
gebunden.

7. VERÖFFENTLICHEN
------------------

cd C:\work\GitProject\project-112
git status
git add .
git commit -m "Release StrideHQ v1.2"
git push origin main

Nach dem grünen GitHub-Actions-Deployment:
https://run-far.github.io/project-112/

HINWEIS ZU STRAVA-KOSTEN
------------------------
Die aktuelle Strava-Dokumentation verlangt ein Strava-Abonnement zum Erstellen
einer API-Anwendung. Deshalb sollte Strava nicht die einzige langfristige
Datenquelle bleiben. Eine kostenlose Alternative für den nächsten Schritt ist
Intervals.icu: Garmin kann dorthin automatisch synchronisieren und Intervals.icu
stellt eine offene API bereit.
