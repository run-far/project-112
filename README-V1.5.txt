Endurance Intelligence v1.5 – Fuel Scan & Inventory
====================================================

Enthalten:
- Produktanlage im Fuel Lab per Barcode-Foto oder Bildauswahl
- Barcode-Erkennung lokal im Browser mit ZXing
- Produktabfrage über Open Food Facts
- Automatische Vorschläge für Marke, Produktname, Kategorie, Kohlenhydrate, Koffein und Produktbild
- Manuelle Eingabe bleibt vollständig erhalten
- Erneutes Scannen desselben Barcodes füllt den vorhandenen Bestand auf
- Bestandseinheiten wie Stück, Portionen, Tabletten oder Beutel
- Workout Review zeigt passende Produkte aus dem Fuel Lab
- Auswahl "Gel" filtert auf Gel-Produkte, Drink Mix auf Drink Mix usw.
- Beim Speichern eines Reviews wird die verwendete Menge automatisch vom Bestand abgezogen
- Wird ein Review später geändert, wird der Bestand anhand der Differenz korrigiert
- Schutz vor negativem Bestand
- Versionsanzeige v1.5

Installation:
1. ZIP über C:\work\GitProject\project-112 entpacken und Dateien ersetzen.
2. PowerShell:

   cd C:\work\GitProject\project-112\project112-app
   npm install
   npm run lint
   npm run build
   npm run dev

3. Lokal prüfen.
4. Veröffentlichen:

   cd C:\work\GitProject\project-112
   git add .
   git commit -m "Release Endurance Intelligence v1.5"
   git push origin main

Hinweis:
Das hochgeladene Foto wird nur im Browser zum Auslesen des Barcodes verwendet und
nicht im Cloud-Zustand gespeichert. Nur der Barcode wird zur Produktsuche verwendet.
Wenn Open Food Facts ein Produkt nicht kennt, bleibt der erkannte Barcode im Formular
und die fehlenden Angaben können manuell ergänzt werden.
