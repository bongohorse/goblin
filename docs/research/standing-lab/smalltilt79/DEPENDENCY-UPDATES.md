# Historical dependency inputs for SmallTilt #79/#81

The archived 75-world execution is **historical evidence**, not a test against the currently installed npm dependencies. The original frozen build-input and source-pin manifests must remain unchanged; their SHA-256 hashes and registered build identities are still enforced.

The following byte-for-byte files come from the historical harness commit `7534e4e473b0371d4e54da553dd59b6ef4abbf6e`:

- `frozen-inputs/package.json`
- `frozen-inputs/package-lock.json`
- `frozen-inputs/scripts/smalltilt79-reader.mjs`

The two archived verifiers read only these three original bytes through `scripts/smalltilt79-historical-inputs.mjs` while keeping the **original repository-relative paths** in the historical build-ID calculation. All other pinned files remain checked against the active checkout. The stored data, original source-hash, and archived build IDs are not changed.

This separation permits unrelated dependency updates without rewriting history or pretending that the archived results were generated using the latest Playwright/Vite. New physics results must separately declare their current runtime and dependencies; the old 75 worlds must **not** be rerun, re-labeled, or silently treated as new evidence.

Historical-byte integrity remains enforced by `tests/smalltilt79-stored.test.js`; changing the stored bytes must fail verification.
