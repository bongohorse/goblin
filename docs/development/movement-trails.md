# Playground movement trails (#103)

## Contract

Read-only `RigidBody.translation()` observes the native **body transform origin** in world metres, not mesh bounds or mass centre. IDs are `head`, `torso`, `pelvis`, `handL`, `handR`, `footL`, `footR`; L/R mean the Goblin's anatomical sides. No COM line, measured force or replay promise.

An opt-in observer in `UprightSession.advanceStep()` runs only after the native step counter advances, including a terminal invalid/safety step. All seven bodies share that step and `time_s = step / 60`. One optional labelled initial pose at step 0; no samples from rendering, camera changes, markers, pause or rejected step attempts. The historical route has no observer and retains its recorder policy, clock and controller. No second world, poses, motors or controller parameters are written.

Master OFF unsubscribes and **clears** history. Re-enable at a nonzero step waits for the next executed step, with no backfill. Individual body switches affect visibility only. Reset, variant/world/run changes clear the buffers. Finite terminal poses retain a Safety marker; missing/nonfinite positions store explicit gaps, break line continuity and never upload NaN. Disposal unsubscribes before the native world is freed.

One shared 600-entry ring stores all seven body origins: 109,800 bytes of typed-array storage (600 × [8 step bytes + 7 × (24 position + 1 flag bytes)]). The last 1/3/10 seconds select a simulation-step window, independent of wall time, speed or run length. Overflow drops old entries, never stops simulation. Hidden bodies retain history while the master is ON. Finite initial poses count toward the same 600 limit.

All cameras draw the same world buffers. RGB brightness fades with simulation age; a bright endpoint indicates the newest finite position. Right-hand/foot strokes are dashed, left strokes solid, with explicit L/R labels and a monochrome mode. No animated speed cue. Depth-independent diagnostic lines can appear through the mesh; they are not selectable and do not enter physics picking. GPU buffers are bounded and reused while enabled, freed on OFF/dispose. No post-processing change.

G2, native Hidden/Resume and the late historical state matrix remain separate open evidence. This package proves no new stability, Standing or mobile-hardware performance acceptance.
