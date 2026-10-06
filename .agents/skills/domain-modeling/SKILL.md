---
name: domain-modeling
description: Clarify Goblin domain terminology and update docs/GLOSSARY.md or record a consequential architecture decision when discussing terminology or editing domain documents.
---

# Domain Modeling - Goblin

Read docs/GLOSSARY.md and docs/agents/domain.md when present, relevant code, issue and research. Check conflicting terms against both implementation and intended behavior; resolve ambiguity through concrete scenarios instead of inventing terminology.

Capture resolved domain terms in docs/GLOSSARY.md with a short definition and optional avoided synonyms. Keep it strictly a glossary: no implementation settings, task status, experiment results or acceptance claims. Create it lazily when a real term is resolved. Keep existing domain/research notes intact; do not rename arbitrary context files or create a multi-context map for this small repository.

For example, distinguish a measurement baseline, an experimental motor run and full Standing acceptance. Do not equate a successful isolated diagnostic with game integration.

Record an ADR under docs/adr/ only when the decision is hard to reverse, surprising without context and the result of real alternatives. Check existing decisions first; use the next sequential number. Write a short statement of context, decision, alternatives and reason. Preserve historical decisions by adding superseding records instead of rewriting history. Do not duplicate established research decisions or invent new architecture as part of vocabulary cleanup.

Update only terms/decisions supported by the authorized task. Surface unresolved contradictions; do not silently change game scope or physics behavior.
