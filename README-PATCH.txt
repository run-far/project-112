StrideHQ Ziele, Archiv und Equipment Patch

Enthalten:
- Hauptziel ist jetzt ein normaler Event-Eintrag und kann bearbeitet werden.
- Jeder Event kann per Checkbox als Hauptziel markiert werden.
- Nur ein aktives Hauptziel gleichzeitig.
- Meilensteine/Events: bearbeiten, archivieren, reaktivieren und endgültig löschen.
- Equipment: Formular wie im Fuel Lab mit Typ-Auswahl, Name und optionalem Limit.
- Equipment: archivieren, reaktivieren und endgültig löschen.
- Fuel: endgültiges Löschen zusätzlich zum Archivieren/Reaktivieren.
- Startseite zeigt unter dem Hauptziel automatisch das nächste aktive Rennen.
- Bestehende lokale Daten werden beim Laden automatisch in das neue Zielmodell migriert.

Installation:
ZIP im Stammordner von project-112 entpacken und vorhandene Dateien ersetzen.
Danach Frontend neu starten:
  cd project112-app
  npm run dev

Geprüft mit:
- npm run build
- npm run lint
