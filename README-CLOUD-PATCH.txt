STRIDEHQ CLOUD PATCH

1. Patch über das Repository entpacken.
2. Im Ordner project112-app ausführen:
   npm install
   npm run build
3. Commit und Push auf main. GitHub Pages veröffentlicht die App automatisch.
4. Supabase CLI installieren und anmelden:
   npm install -g supabase
   supabase login
5. Im Repository ausführen:
   supabase link --project-ref kxuwbjkyjngcgpkqopnh
   supabase functions deploy calendar --no-verify-jwt
6. App öffnen, Konto registrieren/anmelden.
7. Settings > StrideHQ Cloud > "Lokale Daten in Cloud übernehmen" drücken.
8. Settings > Apple Kalender > Abo-Adresse kopieren.

Wichtig: Der Publishable Key ist im Frontend erlaubt. Niemals einen Secret- oder service_role-Key in project112-app eintragen.
