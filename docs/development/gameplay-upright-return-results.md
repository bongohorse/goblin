# T1-Rückkehr R1: Teilverbesserung, Abklingen nicht abgenommen

09.10.2026 · Refs #94 / Draft #95. **Empfehlung: nachbessern; kein vollständiger V2-/Gameplay-Pass.** Genau ein Kandidat, keine Parametersuche und keine weiteren Starts. Historische FAILs bleiben bestehen.

[Vorab eingefrorener Plan](gameplay-upright-return-plan.md), Commit3144cf568237df4a2ae929fa2e5e772948df372c, wurde vor Umsetzung auf #94 veröffentlicht. main4aa0f3b wurde konfliktfrei mit bf27ea9 integriert. Aufnahmehead690b9dcaa05430edf3731a546fdf048aa44508ae; spätere Änderungen betreffen Belegauslieferung, Tests und Bericht. Scene/Session/R1/Controller/Rig/Grab/Clock/Lock werden nach Aufnahme nicht verändert. Alle Quellhashes, Browseridentität, Startledger und Cliphashes im [annotierten Rohbeleg](gameplay-upright-return-evidence.json.gz); unannotierte Originaldatei lokal erhalten, SHA256 im Beleg. Alte T1-Daten/Clips/Verträge bytegleich.

## Änderung und Ursache

Alter Return: 42Steps Cubic-Smoothstep, neutral ab elapsed60. R1: ausschließlich die Rückkehr durch 72Steps Minimum-Jerk ersetzen, neutral ab elapsed90. Gleiche6°/6Rise/12Hold, B, Gains, Caps, Rig und Impulse. Originalcontroller bleibt bytegleich; R1 separat `return=R1`, Standard weiterhin `legacy`. Kein zusätzlicher Kraftpfad oder Body-Transformschreiber. Ziel wird bei Griff/AUS/Fall/Reset über bestehende Unterbrechung gelöscht.

Vorhandene Daten belegten nachlaufende Translation/Rückschwingen trotz neutralem Ziel. Langsamerer, am Rand beschleunigungsstetiger Return war ein begründeter möglicher Hebel. Der neue Vergleich stützt eine Teilwirkung auf Torso-Restgeschwindigkeit, **beweist keine alleinige Ursache**. Kontakt-/Fußgleiten und gekoppelte Rigbewegung sind nicht isoliert geklärt; daraus folgt keine Freigabe für Kräfte, Gains oder Transformkorrekturen.

## Vorabprüfungen und Budget

#97-Checks integriert: Node24.21.0; Source-Head/Quellhashes; HTML/direkte JS/CSS-Bytes und separat alle benötigten Lazy-/Viewerassets des ausgewählten Builds. Bestätigter nativer Chrome156.0.8078.4 auf Windows11, NVIDIA3070Ti ANGLE/D3D11/WebGL2,1280×720/DPR1, isoliertes Profil. Blank-Wasm/WebGL2, Screenshot und finalisiertes Video mit tatsächlicher Framedekodierung vor Budget geprüft. Diese Smokes belegen keine Gameplay-/GPU-Performanceabnahme.

Alle sechs Szenen vor Start pausiertStep0: Pending/Griff/Ziel leer, Inputhandler/gesperrte Buttons/Observer vorhanden. Pausierter Pointerguard und Armierung lassen Stepzahl **und vollständigen Physikzustand unverändert**. Ereignisse prüfen ihre Vorbedingungen im FixedStep-Callback vor dem nächsten `world.step`, nicht nach verspätetem Browserclick. Neue Diagnosearmierung verwendet den vorhandenen ContactGrab; sie ist kein nativer Pointer-/Touch-Griffnachweis. Pure Eventguard aus #97 ist für Browser ausgelagert; CLI exportiert denselben Guard weiter.

| Start | Ablauf / tatsächliche Grenze | Verbrauch | Befund |
|---|---|---:|---|
|1|R ohne Input, kein Zieltrigger|720Steps/12s|vollständige Referenz|
|2|Alt-T1 klein120|720/12s|aufrecht/valid; angewendet|
|3|R1 klein120|720/12s|aufrecht/valid; angewendet|
|4|R1 klein120, Griff150, Move156, Release180|720/12s|Griff aufrecht/aktives Ziel; alle angewendet|
|5|R1 klein120, AUS150, Reset nach Ende240|240/4s|aktives Ziel; ResetStep0 ohne neuen Start|
|6|R1 ausschließlich stark120|720/12s|noch aufrecht/kein vorheriger Fall; angewendet|

**6/6 Starts, 3840Steps=64s insgesamt; jeder≤12s.** Kein dynamischer Abbruch, technischer Fehler, Consolewarning oder HTTP-Fehler, kein Ersatzlauf. Historisches Budget6/6 einschließlich früherem technischen Abbruch bleibt separat unverändert. Keine weitere Dynamik freigegeben.

Gemeinsame Referenz explizit: R1-Rückkehr bleibt in R während0–720 inaktiv; gesamte gemeinsame Identität und vollständiger Vorlauf0–120 sind exakt gleich. Rohidentitäten bleiben erhalten. Unveränderter V2-Reader erhält nur sein ursprüngliches0–360-Fenster und offen deklarierte inaktive Referenzwiederverwendung. Der neue Alt-T1 reproduziert alle alten Body-/Controllerbeobachtungen0–360 exakt.

## Q: gerichtete Reaktion bleibt, späte Breite verfehlt Kriterium

Alle Zahlen P−R; keine Schwelle nach Ergebnis angepasst. RMS ist dreidimensionale Geschwindigkeitsdifferenz, keine alleinige Schwingungsamplitude. +X-Breite enthält auch Drift.

| Größe | Alt-T1 | R1 |
|---|---:|---:|
|Kopf +X-Peak2–4s|75,863mm|80,190mm|
|Torso +X-Peak2–4s|41,660mm|42,584mm|
|Gerichtetes Torso-Δβ Maximum|2,54458°|2,70116°|
|Legacy2° zusätzlich, nur jeweiliger neuer Lauf|2,52300° PASS|2,67899° PASS|
|Torso-Δv-RMS3,5–4s|0,09411m/s|0,07703m/s (−18,1%)|
|Torso-Δv-RMS4–6s|0,04040|0,03580 (−11,4%)|
|Torso-Δv-RMS6–8s|0,02881|0,02180|
|Torso-Δv-RMS8–10s|0,07838|0,02776|
|Torso-Δv-RMS10–12s|0,08294|0,03313|
|R1 Kopf +X-Breite4–6 /10–12s|—|23,546 /28,116mm **FAIL**|
|R1 Torso +X-Breite4–6 /10–12s|—|28,888 /23,605mm|
|FußL +X-Enddrift12s|−20,808mm|−72,688mm|
|FußR +X-Enddrift12s|+33,908mm|−9,862mm|

Prospektive Torso-RMS-Vergleiche bestanden, späte Torso-RMS≤4–6s bestanden. Kopfbreite jedoch größer: vorab verlangte gemeinsame Kopf-/Torsobreitenprüfung **nicht bestanden**. Das beweist nicht isoliert zunehmendes periodisches Schwingen; es verhindert den zugesagten Abkling-Pass. Fußdrift ist kein nachträglich eingeführter numerischer FAIL-Grenzwert, aber ein offen sichtbarer/quantitativer Restbefund.

Beide kleinen Läufe bei4s im unveränderten aufrechten Bereich und über12s ohne unbeabsichtigten Fall/Nicht-Fuß-Bodenauflage; maxAnker5,300mm. R1 bei4s Becken1,11849m, Torso0,21404°, Becken0,16097°, beide Fußdistanz≤0. Keine Behauptung von Stillstand allein aus diesen Haltungswerten. Volle fünf Punkte, β/γ, Quer-/Höhenprojektionen, lineare/angularische RMS und relative Bewegung im Rohbeleg.

## H: Agentensichtprüfung, keine Nutzerabnahme

Clip3 zuerst allein bei1×/Original1280×720, anschließend Clip1 in gleichem Maßstab mit HUD2,53/2,55s; ungezoomte Bilder um3,98s und11,78s.25fps-Beleg ersetzt keine60Hz-Messung. Keine geänderte Kamera, Marker oder quantitatives Sichtbarkeitssurrogat.

- H1 **ja**: kurzer eigener Kopf-/Oberkörperversatz sichtbar.
- H2 **ja**: Ausschlag mit+X und ruhigem Referenzbild vereinbar.
- H3 **unklar**: Haltung kehrt aufrecht zurück, Restbewegung/Fußgleiten begründen keinen überzeugend kontrollierten Abschluss binnen2s. Spätere Bilder verlängern diese Frist nicht.

Clips: [Referenz](gameplay-upright-media/return-1.webm), [Alt-T1](gameplay-upright-media/return-2.webm), [R1](gameplay-upright-media/return-3.webm), [Griff](gameplay-upright-media/return-4.webm), [AUS/Reset](gameplay-upright-media/return-5.webm), [Stark](gameplay-upright-media/return-6.webm). Keine bestätigte Nutzer-Spielgefühlabnahme.

## S und Grenzen

Griff150/AUS150/Stark120: Zielstart null, Kräfte/Torques und alle22 Motorachsen vor folgendem Step null, keine Änderung von Pose/Velocity beim Ausschalten. Danach keine Reaktivierung. Greifen/AUS dürfen dynamisch fallen; bei beiden erster Nicht-Fuß-Bodenkontakt211, kein neuer Sicherheits-Pass für andere Griffe. Reset: identische Parts/Nullgeschwindigkeiten/15Bodies17Collider14Joints, Step0/pausiert/Pending/Trial/Griff leer. Strong vor Hit aufrecht bei120, erster Nicht-Fuß-Bodenkontakt172, **0,867s nach Hit**, ohne vorherige kleine Eingabe. Dynamischer Fall somit in diesem isolierten Fall erhalten. Alle Läufe finite/Anker≤0,15m, keine Direct-Transformkorrektur. Motorwerte sind beobachtete Befehle, keine gemessenen Solverkräfte.

Offen: H3, Kopfbreitenkriterium, Fußdriftursache, weitere#94-Griff-/Block-/Wiederholungs-/Lifecycle-/15s-/Performancekriterien und Nutzerabnahme. Kein Aufstehen. Nächster sinnvoller begrenzter Hebel wäre eine **vorab autorisierte Diagnose der Fußkontakte/Drift anhand dieser gespeicherten Daten**, bevor weitere Returnparameter verändert werden. Hier keine Umsetzung oder neue Phase.

## Betrieb, Validierung und Selbstreview

Beide Builds: `npm run build` und `node node_modules/vite/bin/vite.js build --config vite.gameplay.config.js`. Stepfreie Fähigkeiten: `node scripts/execution-preflight.mjs --help`, [Betriebsanleitung](execution-preflight.md). Runner benötigt bestätigten nativen `--executable`, exakten `--revision`, frisches `--out`, explizite Freigabe `--run-approved-return`. Dieser Auftrag verbraucht6/6: **Runner nicht erneut ausführen**. Kein automatischer Retry oder Ersatzbudget.

Eigener strikter Preview: `node scripts/gameplay-upright-preview.cjs`; meldet belegten Port statt fremden Server zu ändern. Lokal R1: `http://127.0.0.1:4174/goblin/gameplay/upright/?reaction=T1&yield=B&return=R1&observe=return`, Alt-T1 mit `return=legacy`. Buildrevision/Returnmodus im HUD, standardmäßig pausiertStep0. Belege unter `/goblin/return-evidence.json.gz` und `/goblin/gameplay/upright/return-media/sequence-N.webm`. ViewerV2 bleibt historisch, stellt R1 nicht als altes Paar dar.

Erprobte Umgehungen: vorhandener lokaler Node24 statt global26; bestehender repo-lokaler FFmpegcache statt globaler Installation; Videos im Browser per `fetch`/Blob dekodieren/seekbar abspielen (einfacher Preview hat keine ByteRanges). Read-only Berichtsaufrufe hatten zunächst Quoting-/Variablen-/Schemafehler, korrigiert ohne Start oder Rohdatenänderung. Keine lokale MCP-/Systemkonfiguration geändert, keine privaten Pfade eingecheckt. Tool-/Umgebungsursachen aus #97 bleiben dort ehrlich begrenzt dokumentiert.

Gezielte Tests prüfen Rückkehrkurve, unveränderten Rise/Hold/B, native schrittfreie Unterbrechung/Reset, Plan-/Inputguards sowie gespeicherte Budget-/Ereignis-/Cap-/Reset-/Fall-/Vergleichsbelege einschließlich negativem Abklingen. `npm test`:133/133 PASS, darunter5R1-Tests. Dies sind Repositoryregressionen und gespeicherte Leserprüfungen, keine zusätzlichen T1-/Physikstudien. Beide Builds und finale Head-CI im PR-Bericht.

### Spec — Selbstreview

**Relevanter offener Akzeptanzbefund:** R1 erfüllt späte Kopfbreite/H3 nicht; bleibt ausdrücklich opt-in und nicht abgenommen. Keine Umwertung historischer FAILs, kein Merge/Deployment. Genau ein Kandidat und sechs Starts eingehalten.

### Engineering — Selbstreview

Gesamtdiff gegen main geprüft: isolierte Gameplayroute; Arena/Standingforschung/Rig/Grab/Clock/Lock und main-Vite unverändert. R1 verändert ausschließlich Zielrückkehr; Originalcontroller bytegleich. Observer schreibt keine Physik, Guard am tatsächlichen Step, Fehler sichtbar in Trialoutcomes/Console/Runner. Lifecycle/Unterbrechungen bleiben bestehende Pfade; keine neue permanente Physikressource. Relative Assets im separaten Build getestet. Griff über API belegt, Pointer-/Touch-/Hidden-/Performanceumfang offen. Kein weiterer technischer Blocker im geprüften Scope.
