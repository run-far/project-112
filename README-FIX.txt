Endurance Intelligence v1.3.1 – Intervals.icu Status-Fix

Fehler:
"Required request parameter 'oldest' ... is not present"

Ursache:
Der Verbindungstest rief den Activities-Endpunkt ohne die dort zwingend erforderlichen
Parameter oldest und newest auf.

Installation:
1. ZIP über C:\work\GitProject\project-112 entpacken und Datei ersetzen.
2. In PowerShell:

   cd C:\work\GitProject\project-112
   supabase functions deploy intervals

3. App neu laden und unter Settings -> Intervals.icu erneut "Verbindung prüfen" klicken.

Kein npm install und kein Frontend-Build sind für diesen Fix notwendig.
