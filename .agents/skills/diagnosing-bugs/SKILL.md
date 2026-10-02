---
name: diagnosing-bugs
description: Diagnose broken, throwing, visually incorrect, flaky, or slow Goblin behaviour with a reproducible feedback loop before fixing it.
---

# Diagnosing Bugs - Goblin
Get a red-capable loop before theorising.

Preferred loops:
1. focused automated test
2. production build plus browser-console check
3. headless/browser interaction for UI/input
4. deterministic Rapier harness for physics
5. short manual repro with captured console output

For visual/physics bugs, "build passes" is not enough.

Process:
1. reproduce exact symptom
2. minimise scenario
3. write 3-5 falsifiable ranked hypotheses
4. instrument only boundaries that distinguish them
5. change one variable at a time
6. add a regression check at the correct seam when possible
7. apply the smallest fix
8. rerun original repro and `npm run build`
9. remove temporary instrumentation

Tag temporary logs `[DEBUG-...]`. Measure performance before optimising.
