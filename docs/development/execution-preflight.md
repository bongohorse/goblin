# Ausführung vor budgetierten Läufen absichern

Stand 09.10.2026: Basis `origin/main` **59c07f4**, PR [#96](https://github.com/bongohorse/goblin/pull/96) gemergt; [#95](https://github.com/bongohorse/goblin/pull/95) weiterhin Draft auf **fd0b436**. Dieser Auftrag aktiviert weder T1 noch historische Studien. Die Werkzeuge auf main enthalten keinen T1-Controller, Szenenadapter oder neuen Laufmodus. Kein automatischer Retry/Start/Reset, keine Budgetbuchung durch Preflight.

## Priorisierte Fehlerübersicht

U = Umgebung/Tool, R = Repository/Runner, V = Versuchsplanung. Ungeklärte Ursachen bleiben ungeklärt. Quellen: [#94 Fehler/Review](https://github.com/bongohorse/goblin/issues/94#issuecomment-6066134419), [Browserbericht](https://github.com/bongohorse/goblin/issues/94#issuecomment-6066782236), [V2](https://github.com/bongohorse/goblin/issues/94#issuecomment-6073082778), [T1-Abbruch](https://github.com/bongohorse/goblin/issues/94#issuecomment-6073261996), [Abschluss](https://github.com/bongohorse/goblin/issues/94#issuecomment-6073513620), [#96 Toolbericht](https://github.com/bongohorse/goblin/pull/96#issuecomment-6065497281). Historische Berichte in [#95, gepinnte Anleitung](https://github.com/bongohorse/goblin/blob/fd0b436e44f0e7f8f622fec042347baa4b33c693/docs/development/gameplay-upright.md).

| Prio / Fehler | Belegte oder vermutete Ursache | Tatsächlich erprobter Ersatzweg | Verbleibende Auswirkung | Vorbeugung |
| --- | --- | --- | --- | --- |
| P1 U: `helper_unknown_error / setup refresh` vor Prozessstart | Ursache offen; keine Physikaussage | Vorhandener Node-Lesezugang; gezielt genehmigte Shellprozesse | Normale Anbindung nicht repariert | Ein kurzer Prozess-/Versionscheck, begrenzte Diagnose nach AGENTS; keine Dauerschleife |
| P1 U: Git FETCH_HEAD verweigert; gh ohne Anmeldung; Node HTTPS `fetch failed` | FETCH_HEAD-Schreibgrenze belegt, CLI-Anmeldung fehlend; HTTPS-Ursache offen | Genehmigter Git-Fetch; verbundener GitHub-Connector für PR/CI | Connector unterstützt einzelne Endpunkte nicht | Zugänge vorab bestätigen; keine Credential-/MCP-Reparatur, nicht unterstützte Details offen lassen |
| P1 U/R: Preview `ERR_CONNECTION_REFUSED`, unklare Zuordnung | Eigener Server nicht erreichbar; Lebensdauerursache nicht belegt. Falscher/staler Build ist zusätzlich ein Risiko, kein belegter historischer Vorfall | Eigener strikter Preview einmal neu gestartet; finale pausierte URL bestätigt | HTTP 200 allein belegt keinen richtigen Build; Standard-main enthält keine Gameplayroute | `checkPreview` vergleicht ausgewählte HTML-/JS-/CSS-Bytes, erkennt auch SPA-Fallback; erwarteten Build/Commit separat dokumentieren |
| P1 R: `ReferenceError: s is not defined` nach Start | Callbackargument außerhalb Arrow-Gültigkeitsbereichs verwendet, belegter eingeführter Runnerfehler | #95 korrigierte Argumentweitergabe; danach fünf Restläufe ohne technischen Abbruch | Ursprünglicher Start zählt weiter; kein rückwirkender Pass | Wartecallback stepfrei ausführen, Argumente validieren; echte Blank-Browserprüfung vor Start |
| P1 V: Stark traf schon fallende Figur | Eingaben 27–74 Steps später; Nicht-Fuß-Boden Step219 vor Stark237. Einzelanteile von UI-/Diagnose-/Schedulinglatenz nicht gemessen | Tatsächliche Steps berichtet, kein Ersatzlauf | Kein eigenständiger Stark-Fallnachweis, nur 2,05s Restfenster | Ereignis am vorgesehenen Step nur bei bestätigter aufrechter Figur; Frist verpasst → nicht spät anwenden, als ungültig/offen erhalten |
| P2 U: belegtes Chromeprofil; letzter eigener persistenter Tab geschlossen | Profil belegt bzw. Target.createTarget nach Schließen nicht mehr nutzbar | Eigene isolierte Profile; eigenen Blank-Tab erhalten | Keine Berechtigung fremde Profile/Browser zu beenden | Bestätigten Executable verwenden, Profil nicht teilen, bei persistentem Kontext Blank-Tab behalten |
| P2 U: Wasm im REPL abgelehnt | Embeddergrenze in diesem Zugang | Derselbe stepfreie API-Read im Node-Kindprozess | REPL nicht repariert; Blank-Wasm beweist keine Szene | `execution-preflight.mjs` initialisiert/leert/freed Rapier ohne Steps; Browser separat testen |
| P2 U: Dateiscreenshotpfad verweigert | Toolzugriff verweigert, genaue Pfad-/Policyursache nicht geklärt | Reguläre Inline-Screenshotausgabe; native Runner-Dateiscreenshots | MCP-Dateiexport bleibt eigene Fähigkeit | Inline und eigener Dateipfad vorab testen, Toolgrenze respektieren |
| P2 U: FFmpeg fehlt im Standardcache | Fehlender Encoder bzw. anderer Cachepfad belegt | Repo-lokaler FFmpeg1013/Winldd1007, pro Prozess PLAYWRIGHT_BROWSERS_PATH | Kein universeller Encoder/Filterumfang | Blank-Video aufnehmen und finalisieren; kein globaler Download oder automatischer Cachewechsel |
| P2 U/R: FFmpeg ohne fps/tile; Clipseek springt auf 0 | Minimale Filterausstattung; Preview ohne Byte-Ranges | Filterinventar lesen, vorhandener Einzelbilddecoder; #95 Blobwiedergabe mit URL-Revoke | Kein universeller Transcoder; Vieweränderung nur in #95 | Benötigte Filter vorab `-filters` prüfen; Wiedergabe/Seek separat von Aufnahme prüfen |
| P2 U: REPL30s-Timeout, UTF16-Shelllog | Statusverlust/Kernelreset bzw. Encoding, kein belegter Testfehler | Dauerhafte Shellausgabe nach Prozessprüfung; UTF16 richtig lesen | Verlorener Status ist kein FAIL/PASS | Sitzungs-ID/Log erhalten, erst aktiven Prozess prüfen; keine Physik automatisch wiederholen |

## Kurze Vorabprüfung

1. `git status --porcelain=v2`, `git fetch origin`, Issue/PR/Head/Budget prüfen. Nutzerindex erhalten, eigenen Worktree verwenden. Bei fehlender Schreibberechtigung gezielt genehmigten Fetch nutzen. `gh` HTTP401 nicht durch Login/Tokenumbau reparieren; verfügbarer Connector war erfolgreich.
2. `node --version`: **>=24.21.0 <25**. `npm ci` im Worktree. Auf Windows kann `npm.cmd` die blockierte `npm.ps1` vermeiden, ohne ExecutionPolicy zu ändern. In diesem Auftrag tatsächlich erprobt: vorhandener Node24 mit npm-cli.js, PATH nur im Prozess; globaler npm-Cache meldete EPERM, `npm ci --cache .npm-cache --no-audit --no-fund` im Worktree erfolgreich. Keine globalen Pfade einchecken.
3. Stepfreie Checks:

```sh
node --test tests/execution-preflight.test.js
node scripts/execution-preflight.mjs
```

Ohne Browserargument lautet der Browserstatus ausdrücklich **NOT CHECKED**. Node-Rapier-Smoke: `init`, leere World lesen, `free`; kein `world.step`, kein Rig/Assist/Spieltest.

4. Gewünschten Build erzeugen (`npm run build` für main), Buildrevision und dirty-Status festhalten. Eigener Server mit strictPort, keinen belegten Port übernehmen. Bestehenden Server erst identifizieren; nur einen eigenen, in diesem Auftrag gestarteten Server stoppen/neustarten. Erreichbarkeit und tatsächliche Buildbytes prüfen:

```sh
node scripts/execution-preflight.mjs --url http://127.0.0.1:4174/ --dist dist --entry index.html
```

PR-spezifisches Beispiel **nur im später ausdrücklich freigegebenen #95-Worktree**, nach dessen separatem Gameplaybuild und eigenem Preview:

```sh
node scripts/execution-preflight.mjs --url http://127.0.0.1:4174/goblin/gameplay/upright/ --dist dist-gameplay --entry gameplay/upright/index.html
```

Main hat diese Route/Fähigkeit nicht. Tool nicht aus main mit fremdem Runner starten. Prüfung lädt Bytes über HTTP, führt kein HTML/JS aus. Sie bestätigt exakt das ausgewählte lokale Buildverzeichnis, **nicht automatisch dessen Zugehörigkeit zum aktuellen Source-Head**. Frisch bauen und vorhandene eingebettete Buildidentität/Revision abgleichen; keine historischen Pins ändern. Sie erfasst HTML und direkt referenzierte JS/CSS, nicht alle lazy Assets, Clips oder Source Maps. Redirects, fehlende Assets, fremde Origins und Buildabweichungen stoppen; keine automatische Serverreparatur.

5. Benötigte native Fähigkeiten vor budgetiertem Start prüfen. Zuerst konfiguriertes Chrome-DevTools und tatsächlichen Browser bestätigen. Dann denselben bestätigten Executable, eigene ephemere Playwrightsession, kein persönliches Profil:

```sh
node scripts/execution-preflight.mjs --executable "<lokal bestätigte chrome.exe>" --video
```

Bei lokal vorhandenem Encoder PLAYWRIGHT_BROWSERS_PATH ausschließlich für diesen Prozess auf den bestätigten Cache setzen. CLI startet eine leere Seite mit Canvas, führt den echten Wartecallback aus, prüft Browser-Wasm/WebGL2, Inline-/Dateiscreenshot und nach Finalisierung einen tatsächlich dekodierten Videoframe (loadeddata, positive Videobreite/-höhe). Die WebM-Signatur allein genügt nicht. Decodefehler oder 5s-Timeout melden die Fehlerphase und stoppen; kein Fallback. Temporäre Dateien/Blob-URL/Playbacktab werden entfernt. Kein Scene-Start, kein Budgetlauf. Ausgabe enthält Version/DPR/Renderer, keine privaten Pfade. Ohne `--video` ist Video ungetestet. Das beweist weder Performance, Hidden/Resume, Touch, MCP-Dateiexport noch Szenen-Rapier-Laden. Spieltestbedingungen weiterhin separat dokumentieren.

Für nachträgliche FFmpeg-Auswertung am konkreten vorhandenen Encoder `-version` und `-filters` lesen, nötige Filter tatsächlich bestätigen. Playwright-Aufnahme benötigt keine fps/tile-Filter. Kein Encoderwechsel, nur weil Offlinefilter fehlen. Erprobter Ersatz: vorhandener Frame-Decoder oder normale Clipwiedergabe. Bei fehlenden Byte-Ranges bietet #95 bereits Blob-Seek; keine erneute Simulation für Screenshots/Clipsichtung.

## Ereignisvorbedingungen / späterer Integrationsbedarf #95

`scripts/execution-checks.mjs` stellt nur kleine unabhängige Prüfungen bereit. `waitForStep(page, step, readSteps)` übernimmt eine **selbständige, rein lesende Browserfunktion**; keine Closurevariablen, kein Start/Input. Der Preflight prüft sie mit einem konstanten Schrittwert auf einer leeren Seite. Das ersetzt noch keine Prüfung der #95-Diagnose-API.

Vor einer später freigegebenen Ausführung muss #95 diese Prüfungen **vor Ledger/Start** auf seine tatsächlich vorhandenen Eingabe-/Beobachterpfade anwenden: Argumente und geplante Eingaben/Selektoren vorhanden, nachweislich pausiert Step0, korrekte Reaktion/Buildidentität, leere Pending-Eingabe, echter read-only `uprightDiagnostics`-Callback. Den bereits korrigierten #95-Helper wiederverwenden/gezielt anbinden, keine zweite Runnerarchitektur. Diese Integration ist hier nicht umgesetzt und ihre Fähigkeit wird auf main nicht behauptet.

`requireEventPreconditions(event, observed, policy)` prüft exakt geplanten Step, bestätigten gültigen Zustand sowie bei Bedarf `upright` und `activeTarget`. Die Booleans muss der Szenenadapter aus tatsächlicher Telemetrie und den unveränderten Vertragsgrenzen ableiten; Unitfixtures sind kein Aufrechtnachweis. Für **Stark-Fall**: noch aufrecht, kein vorheriger Fall/Nicht-Fuß-Bodenkontakt, ausreichendes vollständiges 3s-Nachfenster. Für **aktive T1-Unterbrechung**: T1 tatsächlich noch aktiv, nicht schon OFF/NEUTRAL. Fall-/Unterbrechungsaussagen getrennt bewerten.

Ein `waitForStep` plus anschließender Browserclick garantiert keinen exakten Step. Späterer Szenenadapter muss Vorbedingung und tatsächliche Anwendung an derselben Stepgrenze prüfen und geplanten/angewandten Step samt Vorzustand protokollieren. Bereits vorhandene Klein-Scheduling-Fähigkeit lesen; Stark/Griff/AUS nicht als bereits stepgenau verfügbar ausgeben. Bei verpasster Frist keinen verspäteten Input nachschieben, keine Ersatzsequenz automatisch starten. Geplanter Fall, Vorzustand und Fenster müssen im nächsten separat freigegebenen Protokoll festgelegt werden; kombinierter Griff→Stark-Lauf ist dafür kein Ersatz. Jede gestartete Physik zählt weiterhin, auch bei Runnerfehler.

## Nachweise und verbleibende Grenzen dieses Pakets

- Drei gezielte Tests ohne Physik: reale lokale HTTP-Bytes inklusive stale Asset/SPA-Fallback/404/Offline, Callbackargumente/ungültige Steps, Ablehnung verspäteter/fallender/inaktiver Ereignisfixtures.
- Node24.21.0: stepfreie Rapier-Init-/Read-/Free-Prüfung erfolgreich.
- Tatsächlicher HTTP-Smoke: bisherige #95-URL nicht erreichbar, korrekt abgelehnt und nicht neu gestartet. Eigener strikter main-Vite-Preview auf4174 danach gestartet; `--url http://127.0.0.1:4174/ --dist dist --entry index.html` bestätigte HTML und3Assets. Nur HTTP-Lesen, eigener Prozess anschließend beendet. Node26 und `--video` ohne Executable werden mit klarer Fehlermeldung abgelehnt.
- Chrome-DevTools Verbindung auf about:blank bestätigt; read-only Prozessabfrage identifizierte den Executable. Playwright nutzte denselben Chrome156.0.8078.4 mit eigenem temporärem Kontext, 1280×720/DPR1, NVIDIA RTX3070Ti ANGLE/D3D11/WebGL2. Reale Blank-Wasm-/Callback-/Inline-/Dateiscreenshot-/Video-Prüfung erfolgreich mit bestehendem lokalem FFmpegcache. Standard-Automationsargumente, kein Foreground-/Hidden-/Performancevergleich. Keine private Identität eingecheckt.
- Aktuelle zusätzliche Toolfehler: Git-Schreibgrenze, gh401, Node26 auf Default-PATH, npm.ps1-Policy, npm-Cache-EPERM. Gezielter Fetch, Connector, bestehender Node24/npm-cli und lokaler Cache funktionierten. Ein Fehler im neuen relativen Assetpfad wurde durch den HTTP-Test gefunden und vor Abschluss behoben.
- Ungeklärt bleiben Prozesshelper-/HTTPS-Ursachen und genaue UI-Latenzanteile. Nicht unterstützte Connectorendpunkte/chrome://version/MCP-Dateipfade sind Toolgrenzen; keine Umgehung. Vorhandene vollständige #95-Abnahme fehlt weiterhin. Kein T1-Lauf/Parameteränderung, kein Merge/Deployment.

Selbstreview: **Spec** — alle Maßnahmen additiv auf main, T1-Fähigkeiten/Adapter nur als spätere Integration beschrieben, alte Budgets/FAILs erhalten. **Engineering** — kein Produktions-/Forschungs-/Vite-/Lock-/CI-Umbau; lokale Cachedateien ignoriert, temporäre Browserressourcen aufgeräumt, kein Fremdprozess beendet.110/110 bestehende und neue npm-Tests,0übersprungen; Produktionsbuild erfolgreich (bekannte Rapier-Chunkwarnung). Keine neue Physikstudie oder T1-Sequenz; unveränderte bestehende CI-Regressionschecks ausgeführt. Finale Head-CI wird in der Draft-PR verlinkt.

Empfehlung für genau einen später begrenzten T1-Schritt: Rückkehr-/Abklingphase separat bearbeiten, mit vorab festgelegtem Budget und einem unveränderten B/T1-Vergleich zur gerichteten Antwort und Restbewegung. Zuerst diese Preflight-/Ereignisprüfungen in #95 anbinden. Keine Aktivierung durch dieses Dokument; nach dieser Draft-PR STOPP.

## Merge-Selbstreview #97 (09.10.2026)

**P2, behoben:** ursprünglicher Video-Smoke akzeptierte bereits die vier WebM-Headerbytes. Ergänzt wurde die echte Frame-Dekodierung im eigenen leeren Playbacktab; native Prüfung mit demselben Chrome156.0.8078.4/1280×720/DPR1/RTX3070Ti erfolgreich. Keine Gameplayseite oder neue Physiksequenz. Stepfreie Tests weiterhin erfolgreich. Preview prüft direkte Referenzen zuverlässig gegen den ausgewählten Build; frischer Build/Source-Head-Abgleich und Lazy-Assetgrenzen bleiben ausdrücklich separat. Keine weiteren relevanten Scope-/Engineeringbefunde. Prüfung durch ursprünglichen Autor, kein unabhängiger Review.

In diesem Mergeauftrag funktioniert der Prozesszugang; Git-Fetch erfolgt gezielt genehmigt wegen Metadaten-Schreibgrenze. Vorhandener Node24 und nur pro Prozess gesetzter bestehender FFmpegcache werden weiterverwendet. Keine Helper-/Credential-/MCP-/Systemreparatur und keine neue Aussage zu historischen offenen Ursachen. Die ausdrückliche Nutzerfreigabe ersetzt den bisherigen Draft-/Merge-STOPP **nur für #97**; #95 und T1 bleiben unverändert gestoppt. Finaler Head, CI und Merge-/automatische main-/Pages-Nachweise stehen im PR-Abschluss.
