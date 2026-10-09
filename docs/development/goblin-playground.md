# Goblin Playground

Persönliches lokales Testlab für den vorhandenen assistierten Gameplay-Prototyp, Refs #88/#94, Draft-PR #95. R1 ist vorläufiger Standard. Bekannte Fußdrift und die offene vollständige Abnahme bleiben sichtbar; kein Aufstehen und keine Nutzerabnahme.

## Spieler-Testprotokoll – P0 (09.10.2026, keine zusätzliche Implementierung)

**Zweck:** Vor der Entscheidung über weiteres Get-up/Recovery zuerst die vorhandenen, nach #94 **nicht vollständig abgenommenen** B/T1/R1-Reaktionen selbst sehen und verwertbare Beobachtungen liefern. Dies ist **keine** 60-s-Standing-, 20-Zyklen-, Hidden-/Resume- oder Release-Abnahme. Kein automatischer P1-/P2-Ausbau.

### Sicherer Zugang zum **aktuellen PR #95** auf Windows

Die bestehenden localhost-Links sind **nur** gültig, wenn auf dem eigenen PC ein Server mit dem korrekten Branch/Build läuft. Ein schon offener Tab bzw. ein bereits laufender Server kann die **ältere** P0-Version zeigen. Für einen frischen, vom eigenen Arbeitsbaum getrennten Test im Goblin-Repository-Ordner in PowerShell:

```powershell
git fetch origin feat/gameplay-upright94
git worktree add --detach ..\goblin-playground-pr95 origin/feat/gameplay-upright94
cd ..\goblin-playground-pr95
git rev-parse HEAD
git rev-parse origin/feat/gameplay-upright94
node --version
npm ci
node node_modules/vite/bin/vite.js build --config vite.gameplay.config.js
node scripts/gameplay-upright-preview.cjs
```

- **Beide `git rev-parse`-Zeilen müssen denselben vollständigen SHA zeigen**, passend zum aktuellen [Head von PR #95](https://github.com/bongohorse/goblin/pull/95/commits). Damit bleibt die Anleitung auch bei späteren reinen Dokumentations-Commits korrekt; der zuvor geprüfte CI-Head `5d497ba...` ist nur historische Referenz, **nicht** automatisch der zuletzt ausgecheckte Head. **Node >=24.21.0 <25** verwenden. Bei abweichenden SHAs **nicht** aus einem alten Preview einen neuen Testerfolg ableiten.
- Öffnen: **http://127.0.0.1:4174/goblin/playground/**. Der lokale Produktionspreview bindet ausschließlich `127.0.0.1:4174`. **Ist Port 4174 bereits belegt, bricht er ab**; weder fremde Prozesse beenden noch alten Server als neuen Build ausgeben. Im Bedarfsfall den belegten Prozess/Build erst identifizieren.
- Die Oberfläche zeigt eine **16-stellige Build-ID**, aber **nicht den vollständigen Commit-SHA**. Im heruntergeladenen Feedback steht `identity.build.revision` mit dem vollständigen Commit sowie `identity.build.dirty`. **Erst diese Daten gegen den erwarteten Head prüfen**; die historische Build-ID `53c6fb42d332d83e` aus der älteren P0-Abnahme nicht als aktuelle Versionsbestätigung verwenden. Ein Workspace mit lokal geänderten Tracking-Dateien hat `dirty:true` und benötigt separate Kennzeichnung.
- Die Arbeit an anderen Branches und laufenden Servern bleibt unangetastet. Das Worktree-Verzeichnis nur dann entfernen, wenn die eigenen dortigen Daten/Downloads nicht mehr benötigt werden.

### Fünf kurze Beobachtungen (keine automatische Qualitätsfreigabe)

1. **R1/Start/kleiner Schubser:** Standard R1 wählen, auf `Start` klicken, `Kleiner Schubser` auslösen. Ist das sichtbare Schwanken nachvollziehbar? Bewegt der Goblin sich überraschend seitwärts, driften Füße oder kippt der Kopf? **Nicht** nur „Test grün“ melden; Beobachtung und Zeitpunkt notieren.
2. **Beobachtungspause:** Während der Reaktion `Pause`, mehrere Sekunden abwarten. Der angezeigte **Schritt** darf nicht weiterlaufen; `Einzelschritt` erhöht ihn um **genau eins**. `Start / Fortsetzen` holt die verstrichene Wartezeit nicht nach. Bei Abweichung Zeitpunkt/Schritt dokumentieren; nicht als physikalischen Standing-Pass interpretieren.
3. **Markierung und Export:** Während eines laufenden Runs `Aktuelle Stelle markieren`; Körperteil/Kategorie/Notiz auswählen, `Feedback als JSON herunterladen`. Die Datei muss `identity.build.revision`, `identity.variant`, `identity.run_id`, `observation.step`, `observation.snapshot`, `observation.pause` und die eigene Notiz enthalten. Fehlen Felder, `data_errors` und konkrete Meldung notieren; keine vollständige Replay-Aufzeichnung erwarten.
4. **B/T1/R1-Vergleich:** Nach jedem Variantenwechsel **frischer Run/Step0**; für jede Variante denselben kleinen Schubser von Hand ausprobieren. Unterschied in Lesbarkeit, Körperbewegung, Rückkehr und Fußdrift **qualitativ** beschreiben. Das sind subjektive Sichtproben, keine identischen Input-Traces oder messgenauen A/B-Läufe.
5. **Starker Schubser oder Körperteilgriff:** Mit eigenem Reset beginnen; starker Stoß bzw. Griff soll die Hilfe abschalten und dynamischen Fall erlauben. **Pause/Markieren bei aktivem Griff ist ausnahmsweise ein Sicherheitsabbruch:** Griff lösen **ohne Wurf**, der Marker speichert den Vorzustand; Fortsetzen stellt die Hilfe **nicht** wieder her, Reset schon. Keine automatische Aufstehfunktion erwarten.

**Mini-Feedback für die Entscheidung:** Genutzte Variante, Buildrevision, gut/schlecht verständliche Reaktion, größter störender Moment, zugehöriges Körperteil, ob Pause/Markierung/Reset klappen. Bei einem Problem möglichst den **lokal heruntergeladenen JSON-Bericht** und ein kurzes Screenshot-/Videobeispiel bereitstellen; private Dateipfade/Browserprofile sind nicht nötig. Die Dateien werden nicht automatisch hochgeladen.

**Separater, weiterhin offener Nachweis:** Echte native Windows-Chrome-Portable-Hidden-/Visible-/Resume-Transition aus #61/#62 erfordert eine eigene Umgebung/Protokollprüfung; ein normaler Vordergrundspieltest und erfolgreiches Feedback-JSON belegen sie **nicht**. Die alten Drift-/H3-/Kopfbreiten-FAILs und fehlendes Aufstehen bleiben trotz positiver Eindrücke offen.

**STOPP nach Nutzerbeobachtung:** Feedback auswerten und **einen** eng begrenzten nächsten Gameplay-Hebel empfehlen. Kein Umbau von R1, Kamera, Reglern, Ghost/Replay, Forschung, Gate #15 oder Server-/CI-Infrastruktur durch diese Anleitung.

## Zugang und Bedienung

- Dev: `node node_modules/vite/bin/vite.js --config vite.gameplay.config.js`, strikt Port 5174, **http://127.0.0.1:5174/playground/**.
- Produktion lokal: `node node_modules/vite/bin/vite.js build --config vite.gameplay.config.js`, dann `node scripts/gameplay-upright-preview.cjs`, strikt Port 4174, **http://127.0.0.1:4174/goblin/playground/**. Kein Deployment. Die separate Gameplay-Konfiguration enthält die Route; der normale Arena-/Standing-Build bleibt unverändert.
- Bereits laufende fremde Server erhalten. Nach Sourceänderungen den eigenen Devserver neu starten: Buildmetadaten werden beim Laden der Vite-Konfiguration erzeugt. Für den Nutzertest den frisch gebauten Preview bevorzugen.

1. B, T1 oder R1 wählen. Jeder Variantenwechsel erzeugt eine neue Simulation mit pausiertem Schritt 0 und neuer Runbindung. B: vorhandene Haltungshilfe ohne zusätzliche Zielreaktion; T1: vorhandene Zielreaktion; R1: T1 mit vorhandener sanfterer Rückkehr.
2. Start, dann kleiner/starker Schubser oder direkt am Körper ziehen. Loslassen nutzt den bisherigen Wurfvertrag. Nach 10 simulierten Sekunden pausiert das bestehende Fenster; neuer Versuch mit Reset.
3. **Pause ist eine Beobachtungspause:** Assistzustand, Motorbefehle, Reaktionsphase, Zielverlauf und vorgemerkte Schrittinputs bleiben erhalten. Fortsetzen holt keine Wandzeit nach. Einzelschritt ist genau ein tatsächlicher 1/60-s-Schritt im selben Pfad und endet wieder pausiert. Während Pause können keine neuen Schubser/Griffe oder Pointerbewegungen aufgestaut werden.
   **Ausnahme aktiver Griff:** Pause/Markieren bricht ihn ausdrücklich als Sicherheitsstopp ab, ohne Wurf. Griff, starker Schubser, Sicherheitsstopp, Escape und Fokus-/Tabverlust schalten Hilfen aus; auch bei bereits beobachtungspausiertem Run. Fortsetzen schaltet sie nicht wieder ein. Nur Reset schaltet die gewählten Hilfen erneut ein. Bewusstes „Hilfe jetzt ausschalten“ ist eine getrennte Aktion.
4. Unter Kamera drehen/zoomen, Seitenansicht oder Kamera-Reset. Rechte Maustaste/Mausrad bzw. zwei Finger; optional ein Finger/linke Taste zum Kameradrehen statt Greifen.
5. Aktuelle Stelle markieren: kopiert genau einen Zustand **vor dem Pausenrequest** und pausiert zustandstreu, solange kein Griff aktiv ist. Bei aktivem Griff hält der Export den Vor-Abbruch-Zustand sowie den anschließend ausgeführten Sicherheitsabbruch fest. Optional Körperteil, Kategorie und Notiz wählen; Feedback als JSON herunterladen. Neue Markierung ersetzt die alte. Reset/Variante löschen Marker, Notiz und Auswahl.

JSON enthält Buildrevision/Quellhash/dirty, Variante, eindeutige Sitzungs-/Run-ID, markierten Schritt/Zeit, verfügbaren Körper-/Assist-/Grabzustand, Kamera/Browser/Viewport und Nutzertext. `observation.pause` nennt Pausenart/Ursache, Request und Aktion (`observation-pause`, `safety-stop`, `already-paused`); `snapshot_timing=before-pause-request` bezeichnet den kopierten Zustand. Bei einer bereits bestehenden Sicherheitspause ist die frühere Ursache kein neuer Abbruch beim Marker. Kein Upload, vollständiger Inputverlauf, Solverrestore, Replay oder Reproduktionsversprechen. Snapshotfehler erzeugen einen ausdrücklich unvollständigen Diagnosebericht; ungültige Kategorie/Körperwahl und Notizen über 2000 Zeichen werden verständlich abgelehnt. Vorhandene finite JSON- und Größenprüfungen aus dem Feedback-MVP werden wiederverwendet.

## Gemeinsame Implementierung

Beide HTML-Routen laden **dieselbe** `src/gameplay/upright-scene.js`, `UprightReturnSlice`, `UprightSession`, `createGoblinRig`, `ContactGrab`, Motoren und FixedClock. Gemeinsame URL-Variantenzuordnung, Default R1 auf beiden Routen; explizite historische URLs behalten ihre Werte. Kein Playgroundcontroller, keine anderen Gains/Caps/Impulse/Zielkurven, keine Kopie der Physik. Einzelschritt und Clock benutzen `advanceStep()` mit derselben bisherigen Reihenfolge. Variantenwechsel baut nur eine frische Instanz des vorhandenen Pfades.

Unterschiede: deutsche Bedienoberfläche, Orbitkamera und lesende Diagnose. Playground deaktiviert ausschließlich den historischen Recorder/Audit, hält keinen Steptrace oder kontinuierliche Framedaten und exportiert nur einen Marker. Gezielter echter Rapier-Test vergleicht für B/T1/R1 jeden vollständigen Snapshot bei gleicher Eingabe zwischen FixedClock mit Recorder und Einzelschritt ohne Recorder. `observePause()` ist in beiden Routen der gemeinsame Beobachtungshalt; `pause(reason)` bleibt der explizite historische Sicherheitsweg für bestehende Runner. Keine UI stellt alte Kräfte/Motoren wieder her. Kamera-/Snapshotzugriff schreibt keine Körpertransformation.

## P0: zustandstreue Pause und Markierung (09.10.2026)

Vorheriger Head `463acf4591c9845e9b534a57f7d285216f903ea7`: UI-Pause und laufende Markierung riefen die Sicherheitsunterbrechung auf; Resume ließ Hilfen aus. Diese damalige Semantik und ihre Ergebnisse sind **historisch**, keine Beobachtungspause. Gespeicherte Clips/Traces/FAILs und ihre Provenienz bleiben unverändert.

| Prüffall | Ergebnis am neuen P0-Stand |
|---|---|
| B/T1/R1, gleiche Stepinputs, unterbrochen vs. ununterbrochen | Über jeweils 144 Schritte identische vollständige native Snapshots, Controller-Timer, Schlafzustände und aufgezeichnete Motorparameter; Tests einschließlich aktiver Rise-/Returnphase |
| Pause/Marker, lange Wandzeit, Einzelschritt/Resume | Keine Änderung am physikalischen Zustand beim Beobachten, genau ein regulärer Step, kein Catch-up; vorgemerkter kleiner Input bleibt bis Step120 erhalten und wird dort einmal angewendet |
| Aktiver Griff, Marker vor Abbruch | Vorzustand mit Griff kopiert; klar benannter Sicherheitsstopp, Griff/Pointer/Pending aufgeräumt, kein Wurf und keine Assistreaktivierung |
| Bereits ausgeschaltete Hilfe / Invalidität / Runende / Reset | Keine Reaktivierung durch Resume/Step; Invalidität/Runende sperren Fortschritt, Reset/Variantenwechsel beginnen frisch ohne alte Marker/Notizen |
| Native Windows-Chrome-Bedienung und Download | B/T1/R1: Pause in Reaktion, 1,5 s Wandzeit warten, exakter eingefrorener Snapshot, Step/Resume und laufender Marker; tatsächliche JSON-Downloads samt Payload, Pending-Reset und Tastaturmarker während Mausgriff; auch Originalprototyp geprüft |

Gezielte Regression: `node --test tests/gameplay-observation-pause.test.js`. Gesamte vorgeschriebene Tests: **142/142**, keine übersprungen; normaler und separater Gameplaybuild bestanden unter Node24.21.0. Keine Parameterstudie/Gameplay-Abnahme. Der separate Build zeigt Build-ID **53c6fb42d332d83e**; finale Revision/dirty und finale Head-CI werden bei Übergabe in #88/#94/PR95 verlinkt.

Native Chrome Portable156.0.8078.4, eigenes temporäres Profil, 1280×720/DPR1, NVIDIA RTX3070Ti ANGLE/D3D11/WebGL2; 744×360 Touch-Emulation geprüft. Keine Console-/Assetfehler im Ablauf. #97 stepfreie Runner-/Node-/Blank-Browserchecks und Produktions-HTML+3 direkte Assets geprüft. Launchargumente, lokale Screenshots/Downloadpayloads und Ergebnis liegen im temporären QA-Verzeichnis; private Pfade bleiben lokal.

**Native Hidden/Resume bleibt offen:** Aktivierung eines eigenen zweiten Tabs erzeugte trotz normaler Hintergrunddrosselung kein `hidden`-Ereignis. Erster gezielter Versuch endete am 5-s-Timeout; begrenzte Folgeprüfung hielt die fehlende Fähigkeit ausdrücklich als NOT PROVEN fest und führte die unabhängigen UI-Checks fort. Keine synthetischen Events/Visibilityoverrides. Der gemeinsame Sicherheitsweg auch bei schon pausierter Beobachtung ist gezielt getestet; das ersetzt keine native Visibility-Abnahme.

Umgebung in diesem Paket: genehmigter gezielter Fetch erfolgreich; lokale Node24-Installation statt globaler Node26, vorhandene gelockte Worktree-Abhängigkeiten. Schreibfreie Chrome-/Port-Prozessidentifikation benötigte nach Zugriffsverweigerung gezielten Prozesslesezugriff; vorhandenes natives Executable bestätigt, keine Fremdprozesse/Browserprofile beendet. Beide Lab-Ports waren bereits durch die zuvor gestarteten Server belegt: neue strikte Startversuche brachen ab; ausgegebene neue Prozess-IDs waren kein Erreichbarkeitsnachweis. Bestehenden statischen Preview anhand frischer HTML-/Assetbytes wiederverwendet. Der Devserver hatte trotz neuer Runtime noch alte Buildmetadaten; seine Worktree-Konfiguration wird ohne Inhaltsänderung erneut geladen. Finale Identität/Erreichbarkeit werden im Tracker bestätigt. Anfängliche Dateinamenannahmen/Windows-rg-Glob korrigiert anhand Inventar; kein Installations-/Konfigurationsumbau. Eine falsche Bodycount-Erwartung im neuen Grifftest korrigiert: vorhandenen Grundbestand plus genau einen Grabanker prüfen. Kein Runtime-/Parameterdefekt daraus abgeleitet.

## Spec — P0-Selbstreview

Freigegebener Paketvertrag aus #88 erfüllt im nachgewiesenen Umfang: gemeinsamer Beobachtungshalt, Safety-/Assist-Aus getrennt, Marker vor nötigem Griffabbruch mit ausdrücklicher Semantik, Pending/Pointer/Runbindung geprüft. Keine Kameraerweiterung, Wireframes, Trails, Regler oder Aufstehen. Historische Pauseverläufe bleiben unverändert archiviert. Keine Nutzer-, Standing-, Hardwareperformance- oder vollständige Gameplay-Abnahme; native Hidden/Resume ausdrücklich offen.

## Engineering — P0-Selbstreview

Vollständiger Paketdiff sowie PR-Diff gegen main geprüft, Selbstreview des Autors. Keine konkurrierenden Transformschreiber, kein Force-/Motorrestore, gleicher advanceStep-Pfad. Controller/Returnkurve/Rig/Grab/FixedClock/Standing/Forschungsdaten/Lock/main-Vite und Workflows bytegleich zum vorherigen Head. Pausekontext unterscheidet aktuellen Request von einer bereits bestehenden Sicherheitspause. Einzelschritt auch im ursprünglichen Prototyp; Blob-/Pointer-/World-Cleanup erhalten. Keine verbleibenden blockierenden Befunde im P0-Scope. Finaler Head/CI und erreichbarer frischer Build werden im Tracker bestätigt. PR bleibt Draft, kein Merge/Deployment; STOPP. Nächster möglicher Hebel: Kameraansichten aus #88, nur nach eigenem Nutzerauftrag.

## Historische erste Playground-Übergabe und Grenzen (Head463acf4)

#97: Runner-/Event-/HTTP-Vorabtests, Node24.21.0 Rapier init/read/free ohne Steps und native Blank-Wasm/WebGL2/Callback/Inline- und Dateiscreenshot erfolgreich. Video wird für dieses Feedbacklab nicht benötigt und nicht neu geprüft. Echte pausierte Szene Step0/Pending/Griff/Observer vor UI-Start geprüft. Produktions-HTML und direkte Assets werden gegen frische lokale Buildbytes verglichen.

Gezielte Nodechecks: gleiche Variantenpfade/Bewegungszustände, Pause/Einzelschritt, Snapshotkopie, Runbindung, nichtendliche Daten, Notizlimit, fehlender Marker und diagnostischer Export. Buildtest sichert die zusätzliche HTML-Route und relative Assets. Native manuell aufgerufene UI-Prüfung: `node tests/playground-browser.cjs --executable <bestätigter nativer Chrome> --url <oben genannte URL>`; keine Forschungsrunner oder historischen Studien neu starten.

Native Windows-Prüfung mit Chrome Portable **156.0.8078.4**, eigenem temporärem Playwrightprofil, Windows/ANGLE NVIDIA RTX3070Ti Direct3D11/WebGL2, 1280×720/DPR1: Einzelschritt, Markierung und tatsächlicher JSON-Download samt Payload; alle Variantenwechsel/Runlöschung, kleine Schubser/Pause/Reset, Handziehen/Release, starker Schubser, Kamera-/Seitenansicht/Zoom ohne Physikänderung. 744×360/DPR1 mit nativer Touch-Emulation: Griff/Release, Reset, erreichbare scrollbare Bedienelemente, kein horizontales Overflow. Keine Console-/Assetfehler im geprüften Ablauf. Lokale Screenshots/JSON/Launchargumente im temporären QA-Ausgabeverzeichnis; keine privaten Pfade eingecheckt.

Kein echter Mobilhardware-, Hidden/Resume-, Performance-, Dauerstabilitäts-, vollständiger Körpergriff-/Hindernis- oder Gameplay-Pass. Keine neue Parameterstudie. Fußdrift, H3/späte Kopfbreite und frühere FAILs unverändert. Neue UI-Funktionschecks sind keine Fortsetzung verbrauchter Research-/Assistversuchsbudgets.

Umgebung: Fetch zunächst durch FETCH_HEAD-Sandboxgrenze blockiert, gezielt freigegebener Fetch erfolgreich. gh401 durch vorhandenen GitHub-Connector ersetzt; globalen Node26 durch vorhandenen lokalen Node24 ersetzt. `npm ci` mit eigenem Worktreecache. Schreibfreie Prozessabfrage nach Sandboxverweigerung gezielt freigegeben; bestehende Browser/Server erhalten, eigene Server auf freien Ports gestartet. Native QA-Commandline-Abfrage benötigte explizites `--enable-automation`; erster Versuch endete vor UI-/Physikstart, korrigiert im eigenen Browserprozess. Keine globale Konfiguration/Credentials/MCPänderung.

Der erste vollständige lokale npm-Testunterprozess verwendete trotz Node24-Elternprozess den globalen Node26 und wurde nicht als finaler Projektnachweis gewertet. PATH ausschließlich für den finalen Prüfprozess auf den vorhandenen Node24 gesetzt; keine globale Änderung.

## Historisches Selbstreview der ersten Playground-Übergabe

Spec: bedienbarer lokaler Slice statt URL-/Runnerhauptansicht; alle bestehenden Parameter/Forschungsstopps erhalten. Keine Nutzerabnahme, kein Merge/Deployment. Engineering: ein gemeinsamer Step-/Interaktionspfad; vorhandene World bei Variantenwechsel freigegeben, Renderer/Meshes weiterverwendet, OrbitControls beim Verlassen entsorgt, Download-Blob freigegeben. Keine Arena-/Standing-/Rig-/Grab-/Clock-/Dependency-/main-Viteänderung. Historische Belege und Pins unverändert. Nächster Hebel ausschließlich: Nutzerfeedback zum vorhandenen Slice abwarten. Danach STOPP.
