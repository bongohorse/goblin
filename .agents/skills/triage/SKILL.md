---
name: triage
description: Turn rough Goblin issues into reproducible, scoped, agent-ready work without prematurely implementing them.
disable-model-invocation: true
---

# Triage - Goblin
For a named issue:
1. read body and comments
2. check whether behaviour already exists
3. for bugs, reproduce or state why blocked
4. separate product questions from implementation facts
5. narrow to one independently verifiable outcome
6. add concrete acceptance criteria
7. recommend: ready, needs info, split with `to-tickets`, or close as obsolete/already implemented

Do not silently rewrite user intent.

If too broad for one focused agent session, use `to-tickets` instead of leaving a giant implementation checklist.
