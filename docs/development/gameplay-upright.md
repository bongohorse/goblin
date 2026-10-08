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
