---
name: handoff
description: Produce a compact continuation note so another agent can resume Goblin work without rereading the whole conversation.
disable-model-invocation: true
---

# Handoff - Goblin
Include only:
- current goal
- issue/PR links
- branch/commit when known
- finished work
- remaining work
- exact passing/failing evidence
- decisions and constraints
- next recommended action
- suggested repo-local skills

Reference existing artifacts instead of duplicating them. Never include secrets.
