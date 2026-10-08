# Gameplay B — lokaler Browser-Prototyp, weiterhin kein #94-Pass

Freigegebener Beobachtungsschritt aus [#94](https://github.com/bongohorse/goblin/issues/94#issuecomment-6066134419), Draft [#95](https://github.com/bongohorse/goblin/pull/95).
Vorher: isolierter Controller ohne spielbaren Einstieg. Jetzt: einfache feste Kamera/Segmentdarstellung, tatsächliches Körperteilgreifen, kleine/starke Originalschubser, Assist-Aus-Baseline, ein fester Block, Pause und **manueller Reset**.

**Konfiguration B bleibt exakt gleich:** Joint K/D 40/2, Up K/D 60/2, supportFraction 0,45, Höhen-K/D 300/50, max_torque_Nm 20. Der Controller, Poseziele, Rig, Physiksolver, dt, Motorhelper und historischen Daten sind bytegleich zu 533928d. Rapier besitzt dynamische Posen und Geschwindigkeiten; die Szene synchronisiert nur Meshes. Kein neuer Controller, keine Parameterregler, Recovery, Produktionsintegration oder Veröffentlichung.

## Eigener Spieltest

Aus dem Repository-Root in den PR-Worktree wechseln:

```powershell
cd .review-worktrees/gameplay94
# Bei fehlenden Abhängigkeiten: npm ci
node node_modules/vite/bin/vite.js build --config vite.gameplay.config.js
node scripts/gameplay-upright-preview.cjs
```

**Lokaler Produktionszugang:** http://127.0.0.1:4174/goblin/gameplay/upright/
Port 4174 ist strikt. Einen vorhandenen fremden Server nicht beenden/übernehmen.
Alternativ: `node node_modules/vite/bin/vite.js --config vite.gameplay.config.js`, strikt 5174, URL `http://127.0.0.1:5174/gameplay/upright/`.

1. „Start / Fortsetzen“, dann direkt am Körperteil greifen und ziehen; Loslassen verwendet den vorhandenen Release-/Wurfvertrag.
2. Klein/Stark wirken am unveränderten Torso-Punkt mit 0,4/3,2 Ns in +X. Optional vor 2 s „Schubser bei 2 s vormerken“ aktivieren und einen Schubser auswählen.
3. „Pause“ oder **Escape** löst einen Griff und deaktiviert die Hilfen. Resume führt frei dynamisch fort; Assist kehrt ausschließlich per Reset zurück.
4. Für Assist-Aus oder Block die Optionen unter „Beim nächsten manuellen Reset“ wählen und **Manueller Reset** drücken. Jede neue Szene/Reset startet pausiert.
5. Nach 10 Simulationssekunden pausiert das Beobachtungsfenster automatisch und schaltet Hilfen aus. „Letzter Physikstep“ bezeichnet den Zustand vor dieser Sicherheits-Pause; live bleibt Assist AUS. Für einen neuen eigenen Versuch ausdrücklich resetten.
6. Unter „Messung & Testzugang“ steht die Buildrevision; Step-Trace exportieren liefert lokale JSON-Daten. Das ist keine wissenschaftliche Standingmessung.

Eigene Nutzer-Spieltests sind keine vom Agenten bereits durchgeführte Abnahme. **Das Agentenbudget ist beendet; nicht das Acht-Sequenzen-Skript erneut starten.**

## Festgelegte Beobachtungen und Ergebnis

Vor Beginn in [#94 protokolliert](https://github.com/bongohorse/goblin/issues/94#issuecomment-6066204591).
**8/8 Sequenzen, eine unveränderte Assist-Konfiguration B, null Gainvarianten**; zusätzlich Assist AUS. Zwei Fehlstarts hatten keine geladene Szene und null Physikschritte.
Tatsächliche Zeit unten einschließlich Schritte zwischen Diagnoseaufnahme und Pause; in Sequenz 8 beide Abschnitte vor/nach Reset addiert. Alte 3/3-Konfigurationen und 5/12-Diagnosen unverändert archiviert; deren Restbudget wurde nicht verwendet.

| Nr. / Zweck | Simulationszeit | Mess-/Zustandsbefund |
| --- | ---: | --- |
| 1 Assist AUS, Idle | 10,000 s | DOWN; erste Nicht-Fuß-Bodennähe bei 1,083 s |
| 2 B, Idle | 10,000 s | ASSISTED_READY, keine Nicht-Fuß-Bodenauflage |
| 3 B, klein bei 2 s | 10,000 s | 0,06210° → 0,50453°: zusätzlich **0,44243°**, Ready |
| 4 B, klein nach Reset | 10,000 s | gleiche 0,44243°, Ready |
| 5 B, stark bei 2 s | 7,567 s | 22 Motorachsen vor Step 121 null; DOWN; Nicht-Fuß-Bodennähe bei 2,867 s |
| 6 B, Handgriff/Release | 7,550 s | handL tatsächlich gepickt; 22 Achsen aus, Hand-/Körperbewegung, DOWN, Release ohne Wurf |
| 7 B, Hand zum Block | 10,000 s | geometrischer Nicht-Fuß-Blockkontakt ab 2,250 s; DOWN |
| 8 Griff → Pause/Reset/Resume | 5,500 s gesamt | Schritte/Posen in Pause eingefroren; Griff entfernt; Spawnpose und Nullgeschwindigkeiten nach Reset identisch, 15 Bodies/14 Rigjoints |

### Browserbeobachtung, getrennt von Zahlen

Native Clips und extrahierte Frames des festen Kamerablicks gesichtet, **keine Nutzerabnahme oder Spaßbewertung**:
- Klein: nur schwaches kurzes Versetzen; kein belastbar deutliches Schwanken wie beim starken Fall. Der alte 2°-FAIL bleibt bestehen. Der passende B-Idle-Vergleich misst maximal **17,523 mm** zusätzlichen Torso-Positionsversatz in 2–4 s; Translation zeigt, warum der skalare Winkel allein nicht alle Bewegung beschreibt.
- Stark: deutlich sichtbares Einknicken/Kippen und Fall; Status wechselt auf Assist AUS.
- Handgriff: Hand folgt sichtbar dem Zug; Körper kippt mit. Release wurde mit `threw:false` beobachtet, **kein Wurfnachweis**.
- Block: Hand/Arm treffen den sichtbaren Block, anschließend bleibt die Figur daneben/hinter ihm liegen. Trace bestätigt Nähe/Kontakt. Assist war bereits vom Griff deaktiviert; **kein unabhängiger Nachweis der Block-Abschaltung bei noch aktivem Assist**, keine vollständige Durchdringungs-/Hindernisabnahme.
- Pause/Reset: Griffcleanup und eingefrorene Pose beobachtet, dann reproduzierbare Anfangspose. Native Tabwechsel lieferten **keine** gespeicherten visibilitychange-Ereignisse; Hidden/Resume bleibt offen. Der Reset löscht den Sessiontrace; Sequenz 8 enthält Vor-Reset-Griffsnapshot und Pauseflags, aber keinen vollständigen Vor-Reset-Zeitverlauf.

[Clip klein](gameplay-upright-media/sequence-3.webm), [Clip stark](gameplay-upright-media/sequence-5.webm), [Clip Block](gameplay-upright-media/sequence-7.webm).
![Nativer starker Fall vor dem Bodenkontakt](gameplay-upright-media/strong-fall.png)

### Assist-Abschaltung und Messgrenzen

Der lesende Observer reicht native Setter unverändert weiter. Bei Griff/Stark: **alle 22 Angularaxis-Caps, stiffness und damping null**, Posen/Geschwindigkeiten innerhalb interrupt unverändert. In den gespeicherten dynamischen Folgeschritten Worldkräfte/-torques und aktive Motorachsen null. Keine automatische Reaktivierung.
Das belegt native Abschaltbefehle plus beobachtete freie Dynamik, **keine separat gemessenen solverinternen Motorimpulse**. `contactCollider` mit Abstand ≤5 mm ist geometrische Nähe, kein Fußlast-/Kontaktimpulsnachweis.

Aufgezeichnete Buildrevision **e45ab3103b7aeb42353aaf4ad94cc8355c1ce780**, Controller SHA256 **4b3117d5584eab803ccb94ad611c5361ef5e80f1496982bfc59a2e90ddc5df71**.
Nach den acht Sequenzen im Selbstreview ausschließlich UI-Texte präzisiert (vorgemerkt/ausgelöst, sichtbare Zeit, letzter Step vor Fensterpause) und Runner-Ledger/Fehlersicherung nachgebessert. **Keine zusätzliche Dynamikprüfung dieser UI-Fassung**; Assist- und Sessionphysik unverändert. Build/Unitchecks und pausierte Darstellung dienen der abschließenden Prüfung. Native Rohdaten/Clips bleiben an ihrer ursprünglichen Buildidentität.

[Unveränderte Browser-Rohdaten, gzip](gameplay-upright-browser-evidence.json.gz), entpackt SHA256 `af7bef5cc6aef32cea20ebdfc860eb59555d9c317cf73b70ca0be50f81654c99`.
Entpacken ohne Versuch:

```powershell
node -e "const f=require('fs'),z=require('zlib');f.writeFileSync('browser-evidence.json',z.gunzipSync(f.readFileSync('docs/development/gameplay-upright-browser-evidence.json.gz')))"
```

Alle acht Clips, Screenshots und das ursprüngliche JSON liegen zusätzlich im lokalen Worktree-Verzeichnis `browser-observation-B-final`; keine erneute Messung zum Lesen erforderlich.

## Testbedingungen und Laufzeit

Native **Windows 11 / win32 10.0.26300 x64**, Node **24.21.0**, Chrome Portable **156.0.8078.4**, headful Playwright mit eigener temporärer Profilidentität. CPU Ryzen 5 5600X; **ANGLE / NVIDIA RTX 3070 Ti / Direct3D11**, WebGL2. Viewport **1280×720**, DPR/Render-DPR **1**. Profilidentität, Executablehash und vollständige bereinigte Launchargumente im Rohbeleg; absolute lokale Pfade nicht eingecheckt. Die drei Flags zur Deaktivierung von Background-Timer-/Occlusion-/Renderer-Throttling wurden entfernt. Weitere Playwright-Automationsflags einschließlich no-sandbox und enable-unsafe-swiftshader sind dokumentiert; der tatsächliche Renderer war NVIDIA/D3D11, kein behaupteter Software-/Mobilnachweis.

Deskriptive P95, jeweils derselbe 10-s-Vordergrundvergleich mit Videoaufnahme und Step-Observer:
- Assist AUS: Frameintervall **18,1 ms**, `session.tick` inklusive Physik/Observer je Renderframe **1,1 ms**.
- B Idle: Frameintervall **18,2 ms**, Physik/Observer **1,0 ms**.
Keine dedizierte Controller-/Solver-Motorprofilierung; keine Messung ohne Video, vollständige #94-Performancefreigabe oder allgemeine Hardwarezusage. Maximal gespeicherte Ankerlücke über Sequenzen 1–7 **0,03901 m**; kein gespeicherter invalid-Endzustand. Vor-Reset-Verlauf von Sequenz 8 ist unvollständig (siehe oben).

## Umgebungsfehler und begrenzte Reparaturen

- Normales exec_command scheitert vor Prozessstart: helper_unknown_error / setup refresh. Vorhandener Node-Zugang funktioniert, gezielt freigegebene Shell-Aufrufe für Git/Browserchecks ebenfalls. Keine globale Konfiguration, fremden Prozesse oder Nutzerindex verändert.
- Chrome DevTools diesmal verbunden. chrome://version-Endpunkt vom Tool abgelehnt, nicht umgangen. Unprivilegierte CIM-Abfrage verweigert; gezielt freigegebene read-only-Abfrage lieferte native Prozessidentität.
- **Browserreparatur 1:** fehlender Playwright-Videoencoder. Nur FFmpeg1013 samt Winldd1007 über vorhandenes Playwright-CLI in repo-lokalen `.browser-tools`-Cache installiert, pro Prozess PLAYWRIGHT_BROWSERS_PATH gesetzt; keine globale Browserinstallation.
- **Browserreparatur 2:** eigener Runner schloss den letzten persistenten Tab und konnte keinen neuen öffnen. Eigener Blank-Tab bleibt jetzt bestehen; keine fremden Tabs/Profile verändert. Erfolgreicher dritter Start, davor jeweils null Gameplayschritte. Reparaturbudget 2/2, unter 15 Minuten; keine weiteren Browserstartversuche.
- Offline-Sichtung: minimale Playwright-FFmpeg-Build unterstützt fps/tile-Filter nicht. Ein erfolgloser Extraktionsaufruf; Filterinventar gelesen und stattdessen vorhandenen Frame-Decoder benutzt. Kein Paketwechsel, Browser- oder Simulationslauf.
- Offen: Ursache der normalen Prozessanbindung, Hidden/Resume, Touch/echte Mobilhardware, Wurf, Kopf-/Fußgriff, isolierte Block-Abschaltung, solverinterne Motorimpulse, 15 s und vollständige #94-Abnahme. Keine Umdeutung der alten Kriterien.

## Validierung, Selbstreview und Entscheidung

Gezielte Tests prüfen B-Identität/Controllerhash, native Befehlsweitergabe und Pause/Reset **ohne world.step**; separater Vite-Buildcheck in npm test sichert die relative Gameplayroute in regulärer CI. Finale Test-/Build-/CI-Ergebnisse stehen im PR und Issue; kein erweitertes Browser- oder Forschungstestprogramm.

**Spec:** Browserdiagnosepaket mit lokalem Zugang geliefert; schwache kleine Reaktion, Block-/Visibility-/Release-Grenzen bleiben offen. **Kein vollständiger Gameplay-Pass, #94 nicht schließen.**

**Engineering:** Vollständiger Diff als Selbstreview, keine unabhängige Reviewbehauptung. Nur isolierte neue Scene/Session/Input/Observer-/Build-/Previewdateien, Tests und Ergebnisdokumentation; Produktionsarena, bestehende Vitekonfiguration, Labmotoren, Forschungspins/Lockdatei und ursprünglicher Assistcontroller unverändert. Recorder ist kein Transformschreiber; Physik läuft ausschließlich über den vorhandenen 1/60-s-Controller. Renderer/World/Grab werden beim Verlassen freigegeben.

**Empfehlung: gezielt ändern, erst nach neuer Entscheidung.** Dynamisches Rig und bestehender Griff-/Fallpfad zeigen sichtbaren Nutzen. Der konkrete nächste Hebel wäre begrenztes zeitliches Nachgeben der globalen Up-Hilfe beim kleinen Schubser, um einen klareren Reaktionsmoment zu ermöglichen. Das bleibt eine ungeprüfte Hypothese, kein Erfolgsversprechen und wurde hier nicht implementiert. B als Produktlösung unverändert weiterzuführen ist nicht empfohlen; den ganzen dynamischen Ansatz zu verwerfen ist durch diese Daten ebenfalls nicht begründet.

**Draft bleibt Draft. Kein Merge, Auto-Merge, Deployment oder Folgephase. STOPP.**

---

## Historischer gesicherter Teilstand 533928d (unverändert archiviert)

Die folgenden Aussagen beschreiben ausschließlich den Stand **vor** der separat freigegebenen Browserphase; dessen NO-GO und Daten bleiben gültig.

# Gameplay #94 — angehaltener, nicht mergefähiger Teilstand

**NO-GO für diesen Kandidaten, 08.10.2026.** Die ausdrückliche Nutzerfreigabe
erlaubte ausschließlich den ersten Haltung-/Fall-Slice aus
[Issue #94](https://github.com/bongohorse/goblin/issues/94). Nach drei
Assist-Konfigurationen besteht kein Kandidat den kleinen Schubser. Weitere
Mechanikentwicklung und Verhaltensversuche wurden entsprechend dessen Stopregel
beendet. Keine Aufstehfunktion, Folgephase oder Forschung aktiviert.

Der Teilstand enthält einen isoliert instanziierbaren Rapier-Controller und
Budget-/Negativbefunde. **Eine fertige spielbare Browser-Szene ist nicht entstanden.**
Es gibt daher keinen ehrlichen Browser-Testzugang. Diese Draft-PR ist eine
prüfbare Sicherung des angehaltenen Versuchs, kein fertiges Gameplaypaket und
keine Mergeempfehlung.

## Eigentümer und vorhandener Code

`src/gameplay/upright-assist.js` verwendet unverändert `createGoblinRig`,
`ContactGrab`, die Mathematikfunktionen sowie `commandMotor/sphericalMotorView`.
15 dynamische Bodies/14 Joints, Massen, Bindpose, Collider, Dämpfung und
Default-Solver bleiben erhalten. Fester Boden und ein optional aktivierter
Testblock sind zusätzliche Collider; keine zusätzliche Engine oder Forschungsszene.

Die Schulterziele werden aus den tatsächlichen Arena-Rotationen und Jointframes
abgeleitet (Z-Quaternionkomponente etwa ±0,27155, entsprechend ±0,55 rad), nicht
als neutrale Lab-Identity übernommen. Spherical-Views verwenden dieselben
Rapier-Handles/Partner, erzeugen keine neuen Joints.

Rapier besitzt alle dynamischen Transformationen/Geschwindigkeiten. Der
Controller schreibt ausschließlich Kräfte, Torques und Motorbefehle. Nur der
sichtbar zu integrierende manuelle Reset darf `rig.reset()` mit Spawnpose und
Nullgeschwindigkeiten aufrufen. Es gibt keine Darstellung, Animation,
Transformübergänge oder automatische Rückkehr in Haltung.

Die World-Stützkraft ist auf 1,25 × Riggewicht begrenzt, Up-Torques auf 20 Nm pro
Body, Motoren auf 20 Nm pro Angularaxis. Befehlsgrenzen beweisen keine gemessenen
Motor-/Kontaktkräfte. Griff und starker Schubser löschen Worldkräfte und setzen
alle Motorcaps, Steifigkeit und Dämpfung auf null. Native API-Aufrufe zum
Abschalten sind geprüft; solverbasierte Restmotor-/Interaktionsabnahme fehlt.

## Vorab festgelegte Konfigurationen und Budget

Die Konfiguration wurde jeweils **vor** dem Versuch in der
[einzigen Rohbelegdatei](gameplay-upright-evidence.json) gespeichert. Diese enthält
alle fünf Versuche, Endzustände, Bindziele und negativen Ergebnisse. Kein
Sweep/Optimierer, kein nachträglich geänderter Schubser, Rig, Solver oder Erfolgsgate.

Gemeinsam: ForceBased, Cap 20 Nm/axis, Stützgewichtanteil 0,45,
Höhen-K/D 300/50, pelvis-Zielhöhe 1,12 m (2 cm unter Bindhöhe für Fuß-Settling).

| Config | Joint K/D | Up K/D | Diagnose |
| --- | --- | --- | --- |
| A | 80 / 10 | 60 / 8 | API-Smoke, 10-s-Haltung, kleiner Schubser |
| B | 40 / 2 | 60 / 2 | kleiner Schubser |
| C | 20 / 1 | 0 / 0 | kleiner Schubser |

**Verbrauch:** drei von drei Konfigurationen; fünf von zwölf Diagnosen,
je höchstens 10 Simulationssekunden (Smoketest 0,5 s). Die übrigen sieben
Versuche wurden nicht gestartet: das Konfigurations-No-Go greift bereits.
Keine fixierte Kandidaten-Abnahmematrix, keine 15-s-/60-s- oder
20-Zyklen-Kampagne. Keine vierte Konfiguration aus verbliebenem Versuchskontingent.

Alle kleinen Schubser bei Step 120/2 s, 0,4 Ns in +X am tatsächlichen
Torso-Colliderpunkt lokal (0; 0,30; 0). Dieser Punkt ist für klein/stark identisch.
Die unverwendete starke API bleibt 3,2 Ns. Gemessen wurden aktuelle Colliderabstände
und Up-Winkel nach realen 1/60-s-Rapier-Schritten, keine Legacy-Lab-Kontaktcaches.

| Versuch | Ergebnis | Fachliche Grenze |
| --- | --- | --- |
| 1, A, API 0,5 s | Bindung und native Commands funktionieren; 15 Bodies/17 Collider/14 Joints, beide Füße nahe Boden | Kein 15-s-/Interaktionsnachweis |
| 2, A, Haltung 10 s | torso max. 1,269°, pelvis max. 2,271°; keine Nicht-Fuß-Bodenberührung; beide Fußabstände am Ende −1,26/−2,85 mm | Nur kurze unterstützte Haltung, nicht 15-s-Abnahme oder Fußlastnachweis |
| 3, A, kleiner Schubser | torso max. über den gesamten Lauf 1,269° | Zusätzliche 2° unmöglich innerhalb dieser beobachteten Obergrenze; FAIL |
| 4, B, kleiner Schubser | torso 0,062° vor Input, 0,505° Peak innerhalb 2 s danach: zusätzlich 0,442°; stabil geblieben | Zu geringe Reaktion, FAIL |
| 5, C, kleiner Schubser | torso 13,118° vor Input, nach Input Fall; erste Nicht-Fuß-Bodenberührung bei 3,0 s, am Ende DOWN | Kleine Störung endet in Fall, FAIL |

Beim A-Versuch wurde zunächst nur das Maximum des ganzen Laufs gespeichert.
Das reicht für dessen negatives 2°-Kriterium, ist aber kein genaues
Input-Antwortmaximum. Für B/C wurde der Observer vor deren Versuchen um
Vor-Input-Winkel und Peak der folgenden zwei Sekunden ergänzt. A-Daten wurden
nicht rückwirkend ergänzt, repariert oder erneut erzeugt.

Es handelt sich um gültige negative Gameplaybefunde, keinen API-/Numerikfehler
und keinen Beweis, dass diese gesamte Architektur unmöglich ist. Kein
unassistierter Standing-Erfolgs- oder Forschungsbefund.

## Prüfen des gesicherten Teilstands

Sauberer Branch `feat/gameplay-upright94`, Basis
`4209f8aafabd3e135cf9079f6001e85f3e7cf9b2`. Node **24.21.0**, installierte
Rapier Compat **0.21.0**, unveränderte npm-Lockdatei. `npm ci --no-audit --no-fund`
im separaten Worktree. Alle fünf mechanischen Diagnosen liefen lokal unter
Windows/Node, nicht im Browser und ohne Frametimingmessung.

```powershell
npm ci
node --test tests/gameplay-upright.test.js
npm test
npm run build
```

Die zwei neuen Tests prüfen Arena-Bindung, Caps, native Abschaltbefehle,
unveränderte Pose/Velocity beim Abschalten, Griffressourcen und reproduzierbaren
Reset. Sie rufen **kein world.step()** auf. Die künstliche Cap-Fixture wird nie
simuliert; diese Tests sind API-/Zustandsprüfungen, keine zusätzlichen
Verhaltensversuche oder Standing-Läufe. Vorhandene Repositorytests behalten
ihre unveränderten Verträge. Keine historischen Baselines/Studien neu generiert.

## Offene Abnahme und Empfehlung

Lokale Checks: zwei neue API-/Stored-Tests erfolgreich; vollständiges `npm test`
109/109 erfolgreich, null übersprungen; `npm run build` erfolgreich mit der
bestehenden großen Rapier-Chunkwarnung. Diese Checks liefern keinen Gameplay-Pass.
Finale PR-Head-/CI-Identität und deren Resultat stehen in der PR und Issue #94.

Vollständiger Diff als **Selbstreview**, keine unabhängige Prüfung:
fachlich blockiert durch den negativen kleinen Schubser und fehlenden
spielbaren Einstieg/Abnahme; keine Änderungen an gepinnten Bestandsdateien.
Ein in-scope-Filterfehler wurde korrigiert: nur Nicht-Fuß-Blockkontakte
unterbrechen. Alle fünf Diagnosen hatten den Block deaktiviert; keine
Trajektorie nachträglich geändert oder wiederholt. Ursprünglicher und
reviewter Controllerhash sind im Rohbeleg getrennt dokumentiert.

Nicht erreicht: 15 s Haltung, kleine Reaktion ≥2°, starke Fallabnahme,
Kopf-/Hand-/Fuß-Interaktion, Hinderniskollision, solverbasierter Nachweis
restloser Abschaltung, native Darstellung/Pointer/Touch/Hidden, wiederholte
Browserresets und Frame-/CPU-P95. Es existieren keine FPS-, Geräte- oder
Nutzerabnahmebehauptungen. Der normale Produktionsbuild enthält diesen noch
unverdrahteten Controller nicht; die Produktionsarena und alle historischen
Quellenpins bleiben bytegleich.

Chrome DevTools scheiterte bereits beim Verbindungscheck an einem belegten
`chrome-profile`. Der zusätzlich konfigurierte Playwright-Zugang zeigt auf
denselben lokalen Chrome-Portable-Pfad, wurde nach dem fachlichen No-Go nicht
für zusätzliche Versuche gestartet. Kein stiller Browserwechsel, keine
synthetische native Abnahme.

**Empfehlung: nachbessern nur nach neuer ausdrücklicher Entscheidung, derzeit
nicht mergen.** Ein einziger möglicher nächster Hebel wäre zeitlich begrenztes
Nachgeben der globalen Up-Hilfe beim kleinen Schubser, statt rein statischer
Gains. Das ist eine neue, hier nicht geprüfte Hypothese; keine zusätzliche
Konfiguration, Recovery, neues Ticket oder Folgearbeit begonnen. **STOPP.**
