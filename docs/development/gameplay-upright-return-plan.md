# T1-Rückkehr R1 — vor Umsetzung fixiert, 09.10.2026

Freigabe: Nutzerauftrag dieser Sitzung; neues Budget **maximal6Starts à maximal12s**, keine Übernahme alter Restbudgets. Aktueller main4aa0f3b, historischer PR95fd0b436; main konfliktfrei per Mergebf27ea9 in den isolierten PR-Branch integriert. Alte Daten/FAILs/Verträge bleiben bytegleich. Kein Merge/Deployment/Aufstehen/Folgepaket; PR bleibt Draft.

## Ursache eingrenzen / genau eine Hypothese

Gespeicherter T1-Verlauf: Ziel6° bisStep138, Torso-β-Peak149, Translationpeak156. Beim Neutralziel180 besitzt der Torso gegenüber R noch−0,19229m/s; Rückschwingen192 beträgt−33,330mm, nachfolgend210 wieder+0,15292m/s. Bei240/2s nach Hit noch−0,09712m/s. Das belegt nachlaufende gekoppelte Translation und Rückschwingen trotz kleiner Torso-Neigung; nicht isoliert bewiesen sind Einzelanteile von Gelenken, Bodenkontakten/Fußgleiten und Dämpfung. Kein belegter Impulsbug. Der 42Step-Cubic-Smoothstep-Return besitzt eine stärkere Sollgeschwindigkeit und nicht verschwindende Randbeschleunigung; ein plausibler Anreger, keine erwiesene alleinige Ursache.

**Eine Hypothese R1:** geringere Sollgeschwindigkeit und stetige Randbeschleunigung der Rückkehr vermindern das angeregte Nachschwingen, ohne den ersten gerichteten Ausschlag zu entfernen. Gleiche6°/6Rise/12Hold, danach **72Steps Minimum-Jerk-Rückkehr** `α=6°·(1−10x³+15x⁴−6x⁵)`, x=(elapsed−18)/72. Neutral exakt abelapsed90, also t3,5s beim Originalhit2s. Maxnormierte Zielgeschwindigkeit1,875/72 statt1,5/42; keine neue Kraft, Gains, Caps, Rig-, Impuls-, Dämpfungs- oder Transformänderung. Kein zweiter Kandidat/Tuning nach Ergebnis. R1 ist separat gelabelt/URL-opt-in; ursprüngliches T1 und B bleiben verfügbar.

## Vorabchecks / Ausführung

Vor Ledger/Start: Source-Head und Buildquellhashes, HTML/direkte JS/CSS-Bytes; sämtliche separat benötigten Buildassets inklusive Lazy-/Viewerbelegen per Byteabgleich. Bestätigter nativer Chrome, eigener Kontext, Blank-Wasm/WebGL2/Screenshot/finalisierter dekodierbarer Clip nach #97. Dann echte Szene pausiertStep0, Inputselektoren/Pointerhandler/Diagnose-API vorhanden, Pending/Griff/Ziele leer, finite Telemetrie. Observer/Callback und Schrittfreiheit über unveränderten Step0/Vollzustand nachgewiesen. Keine zusätzliche dynamische Smoke-Serie.

Feste Szene/Kamera1280×720/DPR1, dt1/60, Originalimpulse0,4Ns/3,2Ns+X am Torso-Lokalpunkt(0;0,30;0), kein Block. Ereignisse werden vor dem folgenden `world.step` im Szenenpfad am tatsächlich erreichten Step geprüft/angewandt, nicht nach verspätetem Browserclick. Griffprüfung verwendet vorhandenes ContactGrab an der aktuellen HandL-Körpermitte und protokolliert API-Griff; kein erfundener nativer Pointer-/Touch-Pass. Nur Diagnosearmierung vor Start, kein dynamischer Body-Transformschreiber. Jede gestartete Physik zählt, auch Fehler/Abbruch. Ledger vor Start persistieren, nie automatischen Zusatzstart/Ersatzlauf.

| Start | Fixierter Ablauf | Dauer / tatsächliche Vorbedingungen |
| --- | --- | --- |
|1 R | T1/R1-fähiger identischer Idle ohne Input |720Steps/12s; keinerlei Zieltrigger|
|2 Alt-T1 | alter T1-Return, klein nach120/vor121 |720Steps; aufrecht/kein Griff/valid beim Hit|
|3 R1 | korrigierter Return, gleicher kleiner Hit120 |720Steps; gleiche Vorbedingungen|
|4 Griff | R1 klein120; HandL-Griff150; Zielmove156 um(+0,20;+0,10;0)m relativ zum Griffpunkt; Release180 |720Steps; Griff150 nur bei aufrecht+aktivem Ziel, echter vorhandener Grabpfad, keine Altreaktivierung|
|5 AUS/Reset | R1 klein120; Assist AUS150; Ende240, danach sichtbarer pausierter Reset |240Steps/4s, Reset0 ohne neuen Start; AUS nur bei aktivem Ziel|
|6 Stark | frische R1-fähige aufrechte Szene; ausschließlich Stark120 |720Steps/12s; vor Hit aufrecht, keine vorausgehende Nicht-Fuß-Bodenauflage/Fall/Griff, mindestens3s vollständiges Nachfenster|

Aufrecht für Ereignis: ASSISTED_READY/AssistEIN, pelvis/torso≤15°, pelvis0,95–1,25m, beide Füße≤3cm und mindestens einer≤5mm, keine Nicht-Fuß-Bodenauflage; aus tatsächlicher Telemetrie. Aktiv: PhaseRISE/HOLD/RETURN mit nichtneutralem Zielstart. Verpasste Schritte/fehlende Vorbedingung → Ereignis nicht verspätet anwenden, Lauf als nicht aussagekräftig markieren, kein Ersatz außerhalb dieser6Starts. Sicherheitsinvalid/nonfinite/Anker>0,15m/uncontrolled energy/Transformkonkurrenz → betroffenen Lauf stoppen; bei gemeinsam untrustworthy Messung weitere Dynamik stoppen. Gültiges negatives Abklingen erlaubt die drei getrennten Sicherheitsfälle weiter zu prüfen, ohne neue Variante.

## Vorab fixierte Auswertung / Entscheidung

**Q:** neue gemeinsame inaktive Referenz1 für2/3, da beide vor Input und ohne Zieltrigger exakt denselben Assistpfad verwenden. Source/Build/Kamera/Body-/Jointzustand und kompletter Vorlauf0–120 müssen nachweislich gleich sein. Unterschied ausschließlich deklarierter Returnmodus, der in R nie aktiviert wird. Originalidentitäten bleiben roh erhalten; keine stille Baselineshift-/Zeitkorrektur. V2-Fenster unverändert0–2,2–4,4–6s mit Legacy2° separat. Zusätzlich6–8,8–10,10–12s; verlängert **nicht** Rückkehrfrist2s. Gerichtete Position/β/γ, lineare/angularische Geschwindigkeitsdifferenzen für fünf Punkte, Fußdrift und Körperbewegung relativ zu Füßen berichten.

Vergleichskriterium prospektiv: Torso-Δv-RMS in3,5–4s und4–6s jeweils geringer als beim neuen altenT1-Lauf2; Spätfenster10–12s keine Zunahme gegenüber4–6s (RMS und Torso/Kopf-Schwingungsbreite getrennt). Alle Größen offen, keine kombinierte Punktzahl oder nachträgliche absolute mm-/Geschwindigkeitsschwelle. Der gleiche aufrechte Bereich muss bei4s wieder erfüllt und im Nachfenster ohne unbeabsichtigten Fall erhalten sein. Stabile bleibende Translation ist kein automatisch zu löschender Fehler; fortgesetztes sichtbares Fußgleiten kann H3 offen lassen.

**H:** V2 ja/nein/unklar für sichtbare eigene Reaktion, passende+X-Richtung gegenüberR und kontrolliert wiederbereite Haltung spätestens4s. Clips allein zuerst, dann HUD-stepausgerichtet im selben unveränderten Bildmaßstab1×; Agentensichtprüfung, keine Nutzer-Spielgefühlabnahme. Größerer Spätzeitraum darf H3-Frist nicht retten. Kein numerischer Sichtbarkeitsersatz.

**S:** vorhandene Commandcaps/Ownership/Anker/finite Werte, keine Nicht-Fuß-Bodenstütze in kleinen Paaren; Zielstart/Kräfte/Torques/22Motorachsen vor Step aus bei Griff/AUS/Stark; keine Wiederaktivierung; Reset reproduziert Spawn/Nullvelocities/Bestand, Pending/Ziel/Griff leer. Historische lastRelease-Diagnose kann erhalten bleiben. Stark-Fall: Nicht-Fuß-Bodenkontakt binnen3s **nach** dem tatsächlichen Stark bei vorher bestätigter Aufrechtheit. Weitere#94-Kriterien (Wiederholungen, andere Griffe/Block,15s/Lifecycle/Performance) bleiben offen.

Empfehlung behalten nur bei gültigem Vergleich, erhaltenem gerichteten Nutzen, besserem Q-Abklingen, Hdreimalja und sicherer Rückkehr/Unterbrechung; sonst nachbessern/verwerfen/offen mit genauem Befund. Keine Schwellenänderung nach Ergebnis. Spätestens6/6 Bericht und vollständiger STOPP.
