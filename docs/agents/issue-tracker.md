# Issue Tracker

This project uses GitHub Issues in `bongohorse/goblin`.

## Conventions
- Parent roadmap: #11
- Prefer one issue per independently verifiable vertical slice.
- Child issues link back to their parent.
- Parent issues get a `## Teilaufgaben` checklist linking every child.
- Dependencies are listed under `## Blocked by`.
- A child with no blockers can start immediately.
- Do not close a parent merely because subtasks were created.

## Child issue relationship
Use native GitHub sub-issues when tooling supports them. Otherwise always use both:
1. child body contains `Parent: #<number>`
2. parent body contains `- [ ] #<child>`
