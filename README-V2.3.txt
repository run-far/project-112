ENDURANCE INTELLIGENCE v2.3 – REVIEW & MOBILE STABILITY

Installation
============
Den Inhalt dieses ZIPs über den bestehenden Projektordner kopieren:
C:\work\GitProject\project-112
Vorhandene Dateien ersetzen.

Danach:
cd C:\work\GitProject\project-112\project112-app
npm install
npm run lint
npm run build
npm run dev

Es wurden keine Supabase Edge Functions geändert. Ein erneutes functions deploy ist nicht nötig.

Neu in v2.3
===========
- iPad/iPhone: Wetter fragt über einen sichtbaren Button nach der Standortfreigabe.
- Standort wird lokal gespeichert und kann aktualisiert werden.
- Review-Dialog sperrt die Seite im Hintergrund und scrollt nur noch im Dialog.
- Mehrere Läufe desselben Tages lassen sich zu einem Laufblock zusammenfassen.
- Distanz, Dauer, Höhenmeter, Puls und Herzfrequenzzonen werden aggregiert.
- Für den Laufblock ist nur eine Review nötig.
- Freie Verpflegungseingaben werden automatisch mit Bestand 0 im Fuel Lab gemerkt.
- Frühere Verpflegungseinträge werden beim Start als Fuel-Lab-Vorschläge übernommen.
- Eine Eingabe bei "Getrunken (ml)" aktiviert Verpflegung und legt einen Elektrolyt-Eintrag in ml an.
- Open Food Facts v3 inklusive product_type=all plus v2-Fallback.
- Barcode-Fotos werden in mehreren Drehungen geprüft.
- Das Produktfoto bleibt bei unbekanntem Barcode erhalten und kann manuell gespeichert werden.
- Hash-Routing und eine GitHub-Pages-404-Weiterleitung verhindern 404 beim Aktualisieren.

Läufe zusammenfassen
====================
Training -> "Läufe zusammenfassen"
Mindestens zwei unbewertete Läufe desselben Tages auswählen.
Beispiel: Aufwärmen + ORC Track + Auslaufen.
Die Originalaktivitäten bleiben unverändert im Datenbestand. Nur die Anzeige und Review werden zusammengefasst.
