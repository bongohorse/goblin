# Goblin Playground

Persönliches lokales Testlab für den vorhandenen assistierten Gameplay-Prototyp, Refs #88/#94, Draft-PR #95. R1 ist vorläufiger Standard. Bekannte Fußdrift und die offene vollständige Abnahme bleiben sichtbar; kein Aufstehen und keine Nutzerabnahme.

## Zugang und Bedienung

- Dev: `node node_modules/vite/bin/vite.js --config vite.gameplay.config.js`, strikt Port 5174, **http://127.0.0.1:5174/playground/**.
- Produktion lokal: `node node_modules/vite/bin/vite.js build --config vite.gameplay.config.js`, dann `node scripts/gameplay-upright-preview.cjs`, strikt Port 4174, **http://127.0.0.1:4174/goblin/playground/**. Kein Deployment. Die separate Gameplay-Konfiguration enthält die Route; der normale Arena-/Standing-Build bleibt unverändert.
- Bereits laufende fremde Server erhalten. Nach Sourceänderungen den eigenen Devserver neu starten: Buildmetadaten werden beim Laden der Vite-Konfiguration erzeugt. Für den Nutzertest den frisch gebauten Preview bevorzugen.

1. B, T1 oder R1 wählen. Jeder Variantenwechsel erzeugt eine neue Simulation mit pausiertem Schritt 0 und neuer Runbindung. B: vorhandene Haltungshilfe ohne zusätzliche Zielreaktion; T1: vorhandene Zielreaktion; R1: T1 mit vorhandener sanfterer Rückkehr.
2. Start, dann kleiner/starker Schubser oder direkt am Körper ziehen. Loslassen nutzt den bisherigen Wurfvertrag. Nach 10 simulierten Sekunden pausiert das bestehende Fenster; neuer Versuch mit Reset.
3. Pause, Griff und starker Schubser schalten Hilfen über den bestehenden Pfad aus. Fortsetzen bleibt dynamisch. Nur manueller Reset schaltet gewählte Hilfen wieder ein. Einzelschritt ist ein tatsächlicher 1/60-s-Schritt im selben Step-Pfad; kein Wiederanschalten der Hilfe.
4. Unter Kamera drehen/zoomen, Seitenansicht oder Kamera-Reset. Rechte Maustaste/Mausrad bzw. zwei Finger; optional ein Finger/linke Taste zum Kameradrehen statt Greifen.
5. Aktuelle Stelle markieren: pausiert einen laufenden Run und kopiert genau einen Zustand. Optional Körperteil, Kategorie und Notiz wählen; Feedback als JSON herunterladen. Neue Markierung ersetzt die alte. Reset/Variante löschen Marker, Notiz und Auswahl.

JSON enthält Buildrevision/Quellhash/dirty, Variante, eindeutige Sitzungs-/Run-ID, markierten Schritt/Zeit, verfügbaren Körper-/Assist-/Grabzustand, Kamera/Browser/Viewport und Nutzertext. Kein Upload, vollständiger Inputverlauf, Solverrestore, Replay oder Reproduktionsversprechen. Snapshotfehler erzeugen einen ausdrücklich unvollständigen Diagnosebericht; ungültige Kategorie/Körperwahl und Notizen über 2000 Zeichen werden verständlich abgelehnt. Vorhandene finite JSON- und Größenprüfungen aus dem Feedback-MVP werden wiederverwendet.

## Gemeinsame Implementierung

Beide HTML-Routen laden **dieselbe** `src/gameplay/upright-scene.js`, `UprightReturnSlice`, `UprightSession`, `createGoblinRig`, `ContactGrab`, Motoren und FixedClock. Gemeinsame URL-Variantenzuordnung, Default R1 auf beiden Routen; explizite historische URLs behalten ihre Werte. Kein Playgroundcontroller, keine anderen Gains/Caps/Impulse/Zielkurven, keine Kopie der Physik. Einzelschritt und Clock benutzen `advanceStep()` mit derselben bisherigen Reihenfolge. Variantenwechsel baut nur eine frische Instanz des vorhandenen Pfades.

Unterschiede: deutsche Bedienoberfläche, Orbitkamera und lesende Diagnose. Playground deaktiviert ausschließlich den historischen Recorder/Audit, hält keinen Steptrace oder kontinuierliche Framedaten und exportiert nur einen Marker. Gezielter echter Rapier-Test vergleicht für B/T1/R1 jeden vollständigen Snapshot bei gleicher Eingabe zwischen FixedClock mit Recorder und Einzelschritt ohne Recorder. Kamera-/Markerzugriff schreibt keine Körpertransformation.

## Prüfung und Grenzen

#97: Runner-/Event-/HTTP-Vorabtests, Node24.21.0 Rapier init/read/free ohne Steps und native Blank-Wasm/WebGL2/Callback/Inline- und Dateiscreenshot erfolgreich. Video wird für dieses Feedbacklab nicht benötigt und nicht neu geprüft. Echte pausierte Szene Step0/Pending/Griff/Observer vor UI-Start geprüft. Produktions-HTML und direkte Assets werden gegen frische lokale Buildbytes verglichen.

Gezielte Nodechecks: gleiche Variantenpfade/Bewegungszustände, Pause/Einzelschritt, Snapshotkopie, Runbindung, nichtendliche Daten, Notizlimit, fehlender Marker und diagnostischer Export. Buildtest sichert die zusätzliche HTML-Route und relative Assets. Native manuell aufgerufene UI-Prüfung: `node tests/playground-browser.cjs --executable <bestätigter nativer Chrome> --url <oben genannte URL>`; keine Forschungsrunner oder historischen Studien neu starten.

Native Windows-Prüfung mit Chrome Portable **156.0.8078.4**, eigenem temporärem Playwrightprofil, Windows/ANGLE NVIDIA RTX3070Ti Direct3D11/WebGL2, 1280×720/DPR1: Einzelschritt, Markierung und tatsächlicher JSON-Download samt Payload; alle Variantenwechsel/Runlöschung, kleine Schubser/Pause/Reset, Handziehen/Release, starker Schubser, Kamera-/Seitenansicht/Zoom ohne Physikänderung. 744×360/DPR1 mit nativer Touch-Emulation: Griff/Release, Reset, erreichbare scrollbare Bedienelemente, kein horizontales Overflow. Keine Console-/Assetfehler im geprüften Ablauf. Lokale Screenshots/JSON/Launchargumente im temporären QA-Ausgabeverzeichnis; keine privaten Pfade eingecheckt.

Kein echter Mobilhardware-, Hidden/Resume-, Performance-, Dauerstabilitäts-, vollständiger Körpergriff-/Hindernis- oder Gameplay-Pass. Keine neue Parameterstudie. Fußdrift, H3/späte Kopfbreite und frühere FAILs unverändert. Neue UI-Funktionschecks sind keine Fortsetzung verbrauchter Research-/Assistversuchsbudgets.

Umgebung: Fetch zunächst durch FETCH_HEAD-Sandboxgrenze blockiert, gezielt freigegebener Fetch erfolgreich. gh401 durch vorhandenen GitHub-Connector ersetzt; globalen Node26 durch vorhandenen lokalen Node24 ersetzt. `npm ci` mit eigenem Worktreecache. Schreibfreie Prozessabfrage nach Sandboxverweigerung gezielt freigegeben; bestehende Browser/Server erhalten, eigene Server auf freien Ports gestartet. Native QA-Commandline-Abfrage benötigte explizites `--enable-automation`; erster Versuch endete vor UI-/Physikstart, korrigiert im eigenen Browserprozess. Keine globale Konfiguration/Credentials/MCPänderung.

## Selbstreview

Spec: bedienbarer lokaler Slice statt URL-/Runnerhauptansicht; alle bestehenden Parameter/Forschungsstopps erhalten. Keine Nutzerabnahme, kein Merge/Deployment. Engineering: ein gemeinsamer Step-/Interaktionspfad; vorhandene World bei Variantenwechsel freigegeben, Renderer/Meshes weiterverwendet, OrbitControls beim Verlassen entsorgt, Download-Blob freigegeben. Keine Arena-/Standing-/Rig-/Grab-/Clock-/Dependency-/main-Viteänderung. Historische Belege und Pins unverändert. Nächster Hebel ausschließlich: Nutzerfeedback zum vorhandenen Slice abwarten. Danach STOPP.
