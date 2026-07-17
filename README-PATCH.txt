StrideHQ OpenStreetMap-Ortssuche

1. ZIP im Hauptordner von project-112 entpacken.
2. Vorhandene Dateien ersetzen.
3. Frontend neu starten: cd project112-app && npm run dev

Neu:
- Ortsvorschläge beim Tippen ab 3 Zeichen
- Auswahl über OpenStreetMap/Nominatim
- Speicherung von Anzeigename, Breiten- und Längengrad
- Wetter nutzt anschließend direkt die gespeicherten Koordinaten
- Manuelle Ortsangaben bleiben weiterhin möglich

Hinweis: Die öffentliche Nominatim-Suche ist für die lokale/private Nutzung gedacht und wird durch eine Verzögerung gedrosselt.
