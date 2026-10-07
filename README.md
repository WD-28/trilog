# TriLog

Das Logbuch für Schwimmen, Rad und Laufen. TriLog liest einen Garmin-Aktivitätenexport (CSV, deutsch oder englisch) und rechnet alles im Browser: Form und Belastung, Zonen, Prognosen je Disziplin und eine Triathlon-Prognose für Sprint, olympisch, 70.3 und 140.6.

Deine Trainingsdaten verlassen das Gerät nicht. Nur für das Rennwetter fragt TriLog bei Open-Meteo nach Ort und Datum des Rennens.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Einstieg der Web-App |
| `css/trilog.css` | Gestaltung, hell und dunkel |
| `js/util.js` | Formatierung, Datum, Icons, Tooltips |
| `js/data.js` | CSV-Import, Speicher im Browser, Sicherung |
| `js/model.js` | Rechenmodell: VDOT, FTP, CSS, Belastung, Prognosen |
| `js/model-extra.js` | Laufdynamik, Laufwatt, SAP, Zuglänge, Body Battery, Kraft, Ausrüstung, Taper, Saison, Verpflegung, Zeitprüfung |
| `js/insights.js` | Befund und Insights Triathlon, Repair Guide |
| `js/insights-sport.js` | Befund und Insights je Disziplin |
| `js/glossar.js` | Erklärungen zu jeder Kennzahl |
| `js/charts.js` | Diagramme als SVG |
| `js/views-core.js` | Bausteine: Kapitel, Kopfzone mit 3D-Jahr, Insights, Race Day, Form, Umfang, Logbuch |
| `js/views-pages.js` | Seiten Triathlon, Gesamt, Schwimmen, Rad, Laufen |
| `js/settings.js` | „Mehr“: Daten, Module, Profil, Rennen, Ausrüstung, Wochenplan |
| `js/app.js` | Navigation, Onboarding, Wetter, Erinnerungen |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation auf dem Home-Bildschirm und Offline-Betrieb |
| `trilog.html` | Alles in einer Datei, zum Öffnen per Doppelklick |

## Veröffentlichen über GitHub Pages

1. Auf github.com ein neues Repository anlegen, z. B. `trilog`.
2. Den Inhalt dieses Ordners hochladen (in VS Code: Ordner öffnen, Repository initialisieren, committen, pushen).
3. Im Repository: Settings → Pages → Branch `main`, Ordner `/ (root)` → Save.
4. Nach etwa einer Minute ist TriLog unter `https://DEINNAME.github.io/trilog/` erreichbar.
5. Am iPhone in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

Die Seite selbst enthält keine persönlichen Daten. Jede Person importiert ihre eigene CSV, die nur in ihrem Browser bleibt.

## Lokal testen

`trilog.html` per Doppelklick öffnen. Für die Web-App-Funktionen (Installation, offline) braucht es einen Webserver, z. B. die VS-Code-Erweiterung „Live Server“ auf `index.html`.

## Updates

Dateien ändern und pushen. Beim nächsten Öffnen lädt TriLog die neue Version; gespeicherte Daten bleiben erhalten. Bei jeder neuen Version in `sw.js` die Versionsnummer (`trilog-v2`) erhöhen, damit Handys die neuen Dateien laden.

## Update auf Version 2

Alle Dateien im Repository durch die neuen ersetzen. Die Datei `js/views.js` gibt es nicht mehr, sie kann gelöscht werden. Gespeicherte Daten im Browser bleiben erhalten.
