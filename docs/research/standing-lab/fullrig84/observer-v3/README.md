# FullRig84 — korrigierter Observer und neuer begrenzter Vergleich

**Geprüfter Befund: completed_negative.** Genau eine neue 90-Fälle-Matrix, 90 Studienallokationen /2645 öffentliche Steps. Null, Yaw und Pitch fail; Roll inconclusive. Kein On-Fall erreicht den eingefrorenen 360-Schritte-Horizont. Alle motorisierten Welten stoppen lokal an der unveränderten COM-Driftgrenze 0.0325m, bevor ein Nicht-Fuß-Körper den Boden berührt. Das bewertet diese Konfiguration mit Cap 0.0016907462686567168Nm; es verbietet keinen allgemeinen Torso-Pelvis-Controller.

Sauberer vorab veröffentlichter Harness: f459973c3a9e293fc82397190c9039adff3eca21; Tree9f2d16a17fafcd29e98cbacfe3299d5be1180ea9; [Präregistrierung](execution/preregistration.json) vor Allocation1 in #84 veröffentlicht (externe veröffentlichte Pretty-JSON-Datei: SHA256 d9f3fa7fbd610fb60dc2cde821eeb085c7737f17b426e04d63d2f9ffb21bc8e6; das archivierte kompakte JSON ist semantisch identisch und hat SHA256 05a12bc037ef3365728e21270b1a17458f1d6b241eb9557a21ad01dff7273e85). Node24.21.0, Windows PC, Rapier0.21.0, Upstream b716d375efc0201003f0cd9ef7168eee0b62c177. Der Stack auf PR85 bleibt unverändert. Kein Tuning, Matrix-Rerun, Merge oder Deployment.

## Messung und Referenzen

[Messvertrag](protocol.md): aktuelle geometrische Berührung gegen die feste Bodentopfläche, gecachte Manifold-/Solverkandidaten und Impuls des abgeschlossenen Intervalls werden getrennt. Impuls/dt ist eine Intervallmittelkraft, keine exakte POST-Kraft. Positive Impulse beweisen keine aktuelle Berührung. Native Query-Witnesses sind separat und definieren keinen Kontakt. Aufwecken/aktive Intervallzuordnung: Kalibratoren ohne Sleep; FullRig wake_all15; NativePoseHold-Setter stellen im gepinnten get_mut(handle,true) das Aufwecken beider Gelenkkörper sicher. Kein allgemeiner Nachweis für inaktive Sleeping-Caches oder beliebige Floor-Edge-Geometrien.

12 Diagnoseallokationen/4445 Steps einschließlich aller Fehlversuche und Browser-Preview-Fallback, Budget12/10000. Reale Luft-/Lastbeginn-/Ruhe-/Cache-Ablösekontrollen, vertauschte Reihenfolge/Collideroffset, unabhängige Formgeometrie und vertikale Impulsbilanz bestanden. Old world51/POST36 bestätigt current touching +45.178379/43.687485N trotz positiver gecachter Abstände. Wenige gespeicherte Korruptionskontrollen prüfen Timing, Last, Anker, Repeat-Last und Archivversion ohne neue Welt.

| Physische Referenz | Historischer Observer | Neue Messversion v2 | Einordnung |
|---|---|---|---|
| Passiv / Solver8 | 70 Schritte, 1.166667s, handL | 69 Schritte, 1.15s, handL | Geometrie erkennt den Kontakt einen Schritt früher |
| ForceBased20 / Solver32 | 3600 Schritte, 60s, timeout | 3600 Schritte, 60s, timeout | Nur Zeitkriterium; keine allgemeine Standingfreigabe |
| ForceBased1 / Solver32 | 187 Schritte, 3.116667s, handL+handR | 186 Schritte, 3.1s, handL+handR | Geometrie erkennt den Kontakt einen Schritt früher |

Die physischen Config-Identitäten bleiben gleich; measurement_version unterscheidet die Messverträge. Cross-Version-Repeatvergleich wird ausdrücklich abgelehnt. Historische Rohdaten/Manifeste bleiben unverändert. Alte Support-/Flugphasenbefunde aus contactDist<=0 sind begrenzt/ungültig; wir schreiben sie nicht nachträglich auf Pass um.

Chrome Portable156.0.8078.4, vorhandene isolierte chrome-devtools-Sitzung; Executable/Profile lokal verifiziert. Foreground1249x1221/DPR1, ANGLE RTX3070Ti/D3D11. Gebautes Lab auf /labs/standing/: passive Single-Step69 und UI-Export stimmen mit Node ohne Abweichung überein, keine Console-Errors/-Warnings. Der zuerst verwendete /goblin/-Previewpfad fiel auf die preparing-Spielseite zurück: eine zusätzliche Welt/0Steps, mitgezählt. Keine Arena-/Hidden-/Performanceabnahme; Automation-Launchflags deaktivieren Hintergrundthrottling. Lokale absolute Pfade bleiben lokal.

## fb32-Ergebnistabelle

Je fünf identische Wiederholungen; unten die Werte eines Repeats. **Beobachtung** endet am lokalen Driftstopp. **Fußkontaktzeit** summiert POST-Schritte mit mindestens einem geometrisch berührenden Fuß; sie ist keine ununterbrochene Kontaktzeit. **Erster Nicht-Fuß-Kontakt: in allen acht Reihen nicht beobachtet**, deshalb rechtszensiert am Stopp, keine vollständige Standingzeit. Torso-RMS und Lastmittel in dieser Tabelle beziehen sich auf das volle beobachtete Präfix einschließlich terminalem POST. Paar-RMS unten verwendet nur das gemeinsame gültige Präfix, ohne den grenzüberschreitenden POST. Lasten einschließlich Einschwingphase sind deskriptiv, keine nachträgliche Supportfreigabe. Reaktion = tatsächlich vor dem Schritt gelesenes direktes Gegenmoment auf Pelvis; native Motoreffort bleibt unbekannt. Speed = gemessener Pelvis-Geschwindigkeitspeak.

| Fall | Modus | Beobachtung s | Fußkontakt s | Torso RMS / Ende rad | Fußlast L / R N | Drift COM / Fußmax mm | Pelvis-Reaktion max mNm / Speed max rad/s | Paarstatus |
|---|---|---:|---:|---|---|---|---|---|
| null | off | 1.217 | 1.167 | 0.019131 / 0.041961 | 45.215 / 43.598 | 32.520 / 2.281 | 0.000000 / 0.072020 | fail |
| null | on | 1.217 | 1.167 | 0.019119 / 0.041940 | 45.215 / 43.598 | 32.516 / 2.282 | 1.690746 / 0.072020 | fail |
| yaw | off | 1.217 | 1.117 | 0.019261 / 0.042510 | 44.890 / 43.924 | 33.129 / 2.058 | 0.000000 / 0.119204 | fail |
| yaw | on | 1.200 | 1.100 | 0.019144 / 0.042099 | 44.867 / 43.946 | 32.786 / 2.215 | 1.690746 / 0.119204 | fail |
| pitch | off | 1.650 | 1.617 | 0.080296 / 0.121904 | 44.793 / 44.009 | 32.997 / 13.260 | 0.000000 / 0.409682 | fail |
| pitch | on | 1.650 | 1.617 | 0.080274 / 0.121865 | 44.793 / 44.009 | 32.979 / 13.261 | 1.690746 / 0.409687 | fail |
| roll | off | 0.250 | 0.217 | 0.024363 / 0.000540 | 22.548 / 65.965 | 34.399 / 11.748 | 0.000000 / 0.294285 | inconclusive |
| roll | on | 0.250 | 0.217 | 0.024363 / 0.000540 | 22.548 / 65.963 | 34.399 / 11.748 | 1.690746 / 0.294343 | inconclusive |

| Bedingung | Gültige gemeinsame Schritte | Torso-RMS Off / On rad | On/Off | Entscheidung |
|---|---:|---|---:|---|
| null | 72 | 0.01861801 / 0.01860588 | 0.999349 | fail: com_drift |
| yaw | 71 | 0.01821543 / 0.01862004 | 1.022213 | fail: pair_response |
| pitch | 98 | 0.07976002 / 0.07973755 | 0.999718 | fail: pair_response |
| roll | 14 | nicht ausreichend | — | inconclusive: insufficient_comparison |

Pitch benötigt RMS-Ratio<=0.75; gemessen0.999718. Yaw verletzt die Nicht-Verschlechterung (RMS-Ratio1.022213 und kürzeres On-Präfix). Null erfüllt den Sechs-Sekunden-Horizont nicht. Roll besitzt nur14 gemeinsame gültige Schritte, weniger als30; die kurze nahezu gleiche Torsoantwort ist keine Nutzenentscheidung. Pitch schließt das erste vollständige Supportfenster31–90 mit ca88.843N Gesamtlast ab; Null/Yaw haben nur Teilfenster und Roll endet vor Settling30. Fehlende vollständige Fenster werden nicht als bestanden gewertet.

## free32 und Negativkontrollen

40 motorfreie Ein-Schritt-Welten prüfen ausschließlich öffentliche direkte Commands/Reaktion. Kein Nicht-Fuß-Kontakt; kumulierte geometrische Fußkontaktzeit0 und Fußintervalllasten0 in diesen kurzen Präfixen. Drift-, Speed- und Reaktionswerte für alle fünf Repeats stehen im [Bericht](report.json). Keine Standing- oder Nutzenwertung.

| free32-Fall | Schrittzahl Off / On | Torso-Ende Off / On rad | On-Pelvismoment mNm | Status |
|---|---:|---|---:|---|
| null | 1 / 1 | 1.831628e-7 / 1.831628e-7 | 0.000000 | Commandprüfung bestanden; keine Standingwertung |
| yaw | 1 / 1 | 9.956110e-9 / 9.956110e-9 | 0.000000 | Commandprüfung bestanden; keine Standingwertung |
| pitch | 1 / 1 | 0.04000000 / 0.03999837 | 1.209123 | Commandprüfung bestanden; keine Standingwertung |
| roll | 1 / 1 | 0.04000000 / 0.04000000 | 1.209123 | Commandprüfung bestanden; keine Standingwertung |

Je fünf wrong-sign- und missing-reaction-Kontrollen werden am tatsächlichen PRE-Readback erkannt; alle zehn erlaubten Ein-Schritt-Negativen sind vollständig und alle passenden positiven Präfixe vorhanden. Command, Cap, Reaktion, Rig, Solver, dt, Starts, Poseziele und numerische Verhaltensgrenzen bleiben exakt #83.

## Routinekorrekturen und Prüfung

Nach allen90 Welten schlug die Gesamtschema-Prüfung am Archivkopf fehl: der Runner hatte die historische Config-Metadatenversion gelesen. Der [ursprünglich ausgegebene Archivkopf](execution/archive-emitted.json) bleibt erhalten. [Stored-only-Reparatur](execution/postprocess.json) ändert nur config.namespace und config.measurement_version aus der vorab veröffentlichten Config; alle physischen Werte sind exakt identisch. Kein Rohrecord, Weltpart, Command, Schritt oder lokaler Terminal wurde geändert oder wiederholt. Der Runner verwendet jetzt auch beim Archivaufbau den aktuellen Configpfad; eine weltfreie Regression schützt ihn.

Der gezielte Abschlussreview ergänzte außerdem den Repeatvergleich um Lasten bei separierter POST-Geometrie mit der bestehenden 1e-5N-Toleranz. Ein kohärent manipulierter gespeicherter Impuls/Load-/Manifold-Satz wird jetzt zurückgewiesen. Die gesamte neue Studie besteht den strengeren Stored-Reader. Die Generierungsprovenienz bleibt der tatsächliche f459973-Harness; der spätere Readerfix wird getrennt in [Checks](checks.json) ausgewiesen.

Unabhängig geprüft: 90 Initialzustände,2645 komplette PRE/Command/POST/Clear-Frames,13315 Rohphasen, alle tatsächlichen Repeat-Präfixe, lokale Stops, Lasten, Geometrie, Commands, Caps, Reaktion und Ledger/Schema/Hash-/Roh-Assembly-Identität. [Roh- und Weltdateien](execution/) mit exakten Bytehashes; [kompakter Bericht](report.json); [gezielter Abschlussreview](final-review.md). Kein zweiter Matrixlauf. Historische149 Evidenzeinträge +6 Plan-Einträge +88 vorige Fortsetzungsdateien unverändert.

| Budgetphase | Allokationen | Öffentliche Steps |
|---|---:|---:|
| Historisches Arbeitspaket inklusive Erstfehler/Diagnose |64|450|
| Neue Observerdiagnose inklusive Fehlversuchen/Browser |12|4445|
| Ein neuer Studienlauf |90|2645|
| Neue Fortsetzung gesamt |102|7090|
| Alle drei Phasen kumulativ |166|7540|

Reguläre Tests/CI sind separat, kein zweiter Studienlauf. Native effort/work, friction work, CoP, Fallursache und zertifizierte Enginepräzision bleiben unbekannt/deskriptiv. #84 bleibt bis Review/Integration offen; #60/#30/#31 bleiben offen.

## Genau ein nächster funktionaler Hebel

**Wirksame Torso-Pelvis-Autorität unter gekoppelter Last im Standing Lab quantifizieren**, um für einen separat beauftragten begrenzten Vergleich ein physikalisch begründetes Drehmomentbudget abzuleiten. Der hier geprüfte konservative1.691mNm-Cap bringt im belasteten FullRig keinen ausreichenden Nutzen; das ist kein allgemeines Controllerverbot. In diesem Auftrag werden keine Gains/Caps angepasst und keine COM-/Ankle-/Hip-/Recovery-/Gameplay-Funktionen gebaut. Ende nach geprüftem Ergebnis.
