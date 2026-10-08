# Standing Lab: local feedback

Open the identified local production build at `/labs/standing/` (Vite preview normally uses port 4174). GitHub Pages uses `/goblin/labs/standing/`; no PR-hosting is added.

1. Check the build summary; expand **details** for the full commit, dirty flag and input-hash build ID. Mode/run and the legacy measurement warning are visible. PR/head/base/CI are unknown because this UI does not query GitHub.
2. Choose an existing preset, Resume/Pause or Single step. **Pause + mark current step** captures exactly one observation; marking again replaces it.
3. Optionally choose a stable body ID and category, then enter up to 2000 characters. This is a human observation/hypothesis, not a verified cause.
4. **Download feedback JSON** saves locally. It includes build/run identity, marked body snapshot, configuration, available unchanged research result, browser viewport/DPR/user-agent, camera and your note. Nothing is uploaded.
5. Reset or a mode change discards the marker and note. An already started export retains the old captured run, even if the UI now shows a new run.

Missing/invalid snapshot or research result produces an explicitly labelled diagnostic report with the data error and available context. Non-finite data is omitted with a reason, never repaired into a valid research record. Above 10 MiB the large result/config/snapshot are explicitly omitted from a smaller diagnostic report; notes are not silently truncated. **Export JSON** remains the original research-only export.

The observer on this implementation's base (`aac456eab83bc3e5b6c20d4a039da3cd153e51cf`) filters cached contact distances. Its contact/load records do not establish validated current support/contact evidence. Native motor effort/saturation/CoP remain unavailable. PR #85/#86 are not incorporated. Reported terminal state, technical data errors, negative behavior and complete Standing acceptance are different statements.

To try the observation again: use the identified build and preset, fresh reset and single-step to the marked step. The JSON is observation/retry context, not full solver state, a replay file or a guarantee of identical results across builds/platforms.

See [Lab rules](labs.md), [Gameplay-first](gameplay-first.md), [Issue #88](https://github.com/bongohorse/goblin/issues/88). No gameplay/physics acceptance follows from a successful download.
