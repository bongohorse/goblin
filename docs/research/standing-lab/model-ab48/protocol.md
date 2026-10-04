
## Vorab-Protokoll (vor Full-Rig-Runs)

main355d74d57279a404f01bb5d887ec99ee1d326a94, RapierJS0.21.0/pinned b716d375, Node24.21.0; isolierter Branch experiment/motor-model-ab-48. Repository-Skills implement/research/code-review/pr, Rapier-Router/Joints/Stability/Debug und Browser-QA angewandt. Nutzerarbeit/Vendor/Dependencies/Ports/MCP bleiben erhalten.

**Quellenbefund, noch experimentell zu bestätigen:** installed impulse_joint.d.ts exponiert MotorModel.AccelerationBased und beide Native-Joint-Setter. Pinned motor_model.rs: ForceBased cfm_gain, AccelerationBased cfm_coeff (Trägheitsskalierung). generic_joint.rs::max_impulse=max_force*dt modellunabhängig; angular constraints clampen an ±max_impulse. Erwartung: maxForce bei Angularmotoren bleibt Nm pro Achse, AB100/12 hat Gain-Einheiten s^-2/s^-1 statt Nm/rad und Nm/(rad/s). Full-Rig actual effort/saturation bleibt N/A.

### Isolierte API-/Responsekalibrierung (vor Full-Rig)
Zwei dynamische zentrierte Kugeln Radius.4, Massen1/2kg (I=.064/.128kg m²), Gravitation/Kontakt/Dämpfung aus, dt1/60/Solver32. Native revolute und spherical, gleiche Moving-Frames. Positive/negative Targets, jede Spherical-Achse, kombinierte Orientierung/rotierte Basis, motor-off/wrong-sign/wrong-axis und fehlender Cap kontrolliert. Cap-Nachweis via erstes isoliertes ΔL/dt im vorab Motorframe, Gegenreaktion ΔL1+ΔL2; nicht auf Full-Rig übertragen. Gesättigte Velocityerror-Gegenprobe für reale Caps20/1, zusätzlich.05Nm; Toleranzen max(1e-4Nm,cap*1e-5), Momentumresiduum1e-6; per-axis != Vektornorm. Tracking nach240steps <.01rad, negatives >.15rad.

**Genau ein optionales Gainpaar vorab analytisch festgelegt:** AB2343.75/281.25 = FB100/12 dividiert durch I_eff=(1/.064+1/.128)^-1=.04266666666666667. Nur wenn isolierte gleiche-Response-Probe gegenüber FB100/12 bei gleichem Cap bestätigt (Winkeldistanz≤1e-5rad, Velocitydifferenz≤1e-4rad/s), dieses Paar zusätzlich in Full-Rig evaluieren. Kein weiteres Paar/keine adaptive Suche. Diese Skalaräquivalenz gilt nur für die zentrierte isotrope Fixture, nicht jede gekoppelte Rigachse; ein einziges globales Gainpaar kann nicht alle Inertias angleichen.

### Full-Rig-Vergleich / Auswahlregel
Erst primäre Frage: FB100/12 versus AB100/12, Caps20 und1, nur Modell wechseln. Danach gegebenenfalls getrennte Frage: AB2343.75/281.25 als analytisch skalierter Kandidat, gleiche Caps. Je Config fünf frische normale Worlds, max3600/60s; unveränderte .05rad/.08m Guards, Invalid stoppt, erster Nicht-Fußkontakt stoppt, InvalidStandingTime=null. Eingefrorenes Rig/dt/Solver32/Massen/Inertias/Startpose/Targets/Materialien/Limits. Eigenes Study-Config/Result-Namespace, bestehende passive/v2-FB-Exports unverändert.

Getrennte diagnostic-after-contact nur ursprüngliche100/12-Fälle FB/AB je Cap, fünf fresh Worlds; StandingTime immer null, Invalid niemals fortsetzen. Keine diagnostic-after-contact-Probe der kalibrierten Gains. Erfasse erste Kontakte/Impact/Ende, DriftPeak/Ende, End-/Peakfootloads und Supportanteil, Pelvis/Torsoorientierung, Tracking, Limit-/Anker-/Achsenfehler, körperliche Sequenzhashes und Reproduzierbarkeit. Passive Originalcheckpoints70/handL (sechs Toleranzen aus compare.js unverändert) und ForceBased20/1 numerische Exporte gegen gemergte #46-Referenz vergleichen. Normale gültige Wiederholungen innerhalb existierender Toleranzen; Invalid-Wiederholung nur Diagnosegleichheit, niemals Pass.

CPU separat in gleicher erster60-Step-Phase: drei Warmup-Worlds + fünf Messworlds pro Config, FB/AB-Reihenfolge alterniert,300 world.step-Samples, Commands/Observation separat. Jede World hat dieselbe Physik, dt/Count und Safety-/Terminalprüfung; wenn eine normale Config vor60 endet, kein fairer60-Step-Vergleich behauptet. Raw samples, Median/P95/max/Wiederholungsquantile und Timerauflösung, kein Trimming; keine Browser/GPU/Raf-/Nodevermischung.

**Entscheidungsregel:** jede Frage getrennt, Ungültigkeit ist Nachteil;60s nur Zeitkriterium. Keine erfundenen sekundären Produktions-Schwellen. Ohne konsistenten Vorteil in Validität/Support/Drift/Tracking/Jointfehlern und vergleichbarerCPU ForceBased beibehalten bzw. AB nur als weiteren separat zu prüfenden Kandidaten benennen; kein Defaultwechsel. Isolierte Skalargleichheit nicht als Full-Rig-Steueräquivalenz ausgeben. Sauberer Build/Browser für bestehende Referenz und Study-Kandidat, normale Terminale/Lifecycle/Export, Screenshots ansehen; Tests/Review/finaleCI/DraftPR/Entscheidung. Kein Merge/Deployment/Balance.


## Gate A bestanden — isolierte Kalibrierung

Clean Fixture-Head4b6e1a2 (dirty=false in Rohdaten):24 Cap-/Reaktionsfälle (.05/1/20Nm, beide Vorzeichen, revolute/spherical) und36 Trackingfälle bestanden; Negative off/wrong-sign/wrong-axis/missing-cap erkannt. Modellunabhängige reale per-axis-Nm-Caps bestätigt. AB-Massenskalierung: Verdopplung der Fixturemassen lässt erster-Step-Response identisch (0rad Differenz); FB zeigt.005436325rad. Zur Prüfmethodik: zusätzliche anfängliche Massenskalierungsassertion beiStep10 war ungeeignet (FB bereits fast konvergiert,.000730894rad unter ad-hoc.001); auf erste-Step-Response korrigiert, Step10-Rohwerte weiterhin gespeichert. Kein Gainpaar/Toleranz der vorab definierten Kalibrierung verändert.

Analytisches AB2343.75/281.25 gegenüber FB100/12: max Winkelabweichung über240Steps≤9.52e-8rad, max Velocityabweichung≤1.057e-6rad/s, beide Jointtypen und Caps20/1. Damit optionale genau-ein-Paar-Bedingung aus Protokoll erfüllt. Kalibrierung getrennt vom Full-Rig; keine Fairnessgleichheit aller Rigachsen behauptet.

Nächster Gate: separat versionierte ModelStudy-v3 Config/Reader/Runner, unveränderte v1/v2-Baselines und fünf frische Normal-/getrennte Diagnose-Runs nach Vorabprotokoll. Noch keine Full-Rig-Ergebnis-/Gewinnerbehauptung.
