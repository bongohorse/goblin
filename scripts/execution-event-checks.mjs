// Browser-safe portion of #97: no dependencies, inputs or simulation calls.
export function requireEventPreconditions(event, observed, policy) {
  for (const [name, value] of [['planned step', policy.step], ['observed step', observed.step]]) {
    if (!Number.isSafeInteger(value) || value < 0) throw Error(`${name}: expected nonnegative safe integer`);
  }
  if (observed.step !== policy.step) throw Error(`${event}: missed planned step; do not apply late or retry`);
  if (observed.invalid !== false) throw Error(`${event}: safety state not confirmed valid`);
  if (policy.upright && observed.upright !== true) throw Error(`${event}: upright figure required`);
  if (policy.activeTarget && observed.activeTarget !== true) throw Error(`${event}: active target required`);
}
