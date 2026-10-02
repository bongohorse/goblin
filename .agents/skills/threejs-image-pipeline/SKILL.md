---
name: threejs-image-pipeline
description: Own Beat your Goblin final-image rendering: HDR signal, bloom, exposure, tone mapping, grading, output color space and post-process ordering.
---

# Image Pipeline - Goblin

Use this skill only when post-processing or color pipeline work is actually part of the task.

## Order

HDR scene
-> optional lighting-related screen effects
-> optional bloom contribution
-> exposure
-> tone mapping
-> restrained creative grade
-> output conversion
-> DOM/UI remains independent unless intentionally composited

## Rules

- Tone-map once.
- Keep renderer/output color-space ownership explicit.
- Do not use exposure to compensate for broken light ratios.
- Bloom extracts genuinely bright HDR signal; it does not create form.
- Tune materials and lighting with bloom disabled first.
- Do not stack multiple color corrections that cancel each other.
- Any post pass must have a toggle for diagnosis.
- Avoid full-resolution passes whose benefit is not visible on a phone.
- Protect UI readability from post-processing.
- Keep a no-post baseline that still looks coherent.

## Goblin default posture

Start with:
- correct color space
- deliberate tone mapping/exposure
- no or restrained bloom
- no AO/post effect unless it fixes a clearly observed visual problem

Add complexity only after visual validation shows a need.
