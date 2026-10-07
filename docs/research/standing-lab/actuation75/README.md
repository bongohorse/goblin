# Bounded real actuation — Issue75

**Decision: local_supported in the frozen fixtures only.** All135 fresh public Rapier0.21.0 observations and independently recomputed local comparisons pass. General precision is indeterminate_not_certified. No Gate-B/Upright/standing/controller approval. DraftPR76 is stacked on unmerged DraftPR73; main unchanged.

## Identity and scope

Immutable actuation74 protocol/config from c8fc2816951a559b5b4fc5ff0c4c6e7b745985ea, hashes in [plan.json](plan.json). Plan/source review published before measurement, clean harness 4cce5d01261eae0588a9fb75c75a2f6ab0de7371. Fixed Node24.21.0/Windows10.0.26300, CPU in raw provenance, actual T=.01666666753590107s, nominal1/60, solver32/internalPGS1/maxCCD1/extra0; no rig/gain/dt changes. 24 positives +3 faulty commands x5 worlds;40 zero-step impulses,95 one-step torques. [raw.json](raw.json) preserves all PRE/POST, actual getter/phase logs, inverse tensors, defaults and independent references. No new world after this matrix. Existing regression tests run separately; no new historical425 measurement batch.

## Three separate claims

- **Commands:**120 positive observations satisfy exact paired encoded world commands, phase/reset/force/getter/cap invariants.15 negatives are expected intended-contract violations, identified from actual commands/readbacks. Whole-vector .15Nm cap, Float32 toward-zero encoding and impulse Nm*s=T*tau retained; axial actual readback .14999999105930328Nm. Missing reaction actually adds zero on partner; frame actually applies encoded(.1325952261686325,.04507753625512123,-.053726326674222946)Nm; units actually adds .0024999999441206455Nm instead of .14999999105930328Nm, once through addTorque.
- **Local physics evidence:** all40 impulse/angular controls (max1.1512066543904615e-8rad/s vs original1e-5), inverse tensor controls (max9.843776749112226e-8 relative vs1e-5), independent analytic/convergence/work/conservation and matrix/origin/q-sign checks pass. Negatives are physically distinguishable by the unchanged inequalities below. This supports only these declared fixtures.
- **General engine precision:** unknown envelope and physical endpoint/H markers stay null. Nonzero physical residues are measurements, not fitted limits, engine certification or proof of an external support moment. Command equality cannot exclude common unobserved moments.

## Frozen empirical separation

Guard uOmega=uH=1e-10, require both strictly positive margins after subtracting2u. All five measurements per case identical; no statistical confidence claimed. Distances are pair-angular L2 for frame/units, H norms for reaction.

|Negative|Matched positive max|Negative vs correct target min|Negative vs actual faulty model max|Two margins|
|---|---:|---:|---:|---|
|Frame (rad/s)|1.1868884556280025e-5|.07392734526245132|1.693843539250432e-5|.07391547617789504; .0739104066270588|
|Units (rad/s)|1.1868884556280025e-5|.22733597984559084|9.153375595771936e-9|.22732411076103456; .22733597049221527|
|Missing reaction (kg*m²/s)|1.998469148388647e-8|.002500002483246517|1.2179478531538406e-8|.002499982298555033; .002499990103767985|

Correct paired-zero target remains distinct from the actual unpaired torque integral; a small unpaired-model error is not paired conservation. [decision.json](decision.json) is recomputed by the reader.

## Descriptive residuals and reproducibility

Largest positive torque endpoint angular1.0561756554061766e-4rad/s, angle4.915967308238291e-4rad, linear1.0554356488715967e-5m/s, position6.872887904660218e-6m; largest physical current-time POST DeltaH1.255350447578196e-6kg*m²/s. These are **not acceptance thresholds**. [analysis.json](analysis.json) supplies all135 anchor vectors/norms, per-body shortest quaternion errors, combined COM and physical H/P comparison vectors. PRE alignment error is separated from integration residuals.

Read stored observations (does not start worlds):

```sh
node scripts/actuation75-reader.mjs docs/research/standing-lab/actuation75/raw.json
node scripts/actuation75-analysis.mjs docs/research/standing-lab/actuation75/raw.json /path/outside-worktree/analysis.json
npm test
npm run build
```

Do not rerun actuation75-runner as part of review/CI: the135 authorized measurement worlds are complete. [checks.json](checks.json), [provenance.json](provenance.json), [review.md](review.md) and [sha256.json](sha256.json) document validity/source/evidence identities. Hashes give traceability, not authenticity of substituted trajectories. Old72 manifest entries/False/null/pilot states remain unchanged. One reader P2 fixed after measurement without changing raw data or measured runner/model. Browser N/A.

## Narrow later decision template — not execution authorization

A separate Issue60 follow-up may consider the original five-world small-tilt on/off behavior with PD1.34/1.34, nominal .15Nm whole-vector hard cap, original +/-X .08,+/-Z .08 and combined .06/-.06, domain<=.2rad,360 nominal steps/6s; directly measure terminal tilt<.01rad, transverse torso speed<.02rad/s and original off1e-5rad criterion, report actual360*Float32(dt). Preserve physical dynamic partner and yaw freedom. No parameter/tolerance change, one-step-to6s extrapolation, FullRig/COM/standing acceptance or automatic start. This is an unexecuted decision template; #60 remains stopped pending a separate execution order.

Stop after Draft/decision. No merge, deployment or upright experiment.
