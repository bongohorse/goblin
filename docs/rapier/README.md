# Local Rapier reference

This project keeps the matching Rapier upstream source as a pinned Git submodule so Codex and developers can inspect the relevant documentation and implementation locally instead of repeatedly querying the website.

## Version baseline

Goblin currently locks:

- npm package: `@dimforge/rapier3d-compat`
- installed version in `package-lock.json`: **0.21.0**
- upstream Rapier tag: **`js-v0.21.0`**
- upstream commit: **`b716d375efc0201003f0cd9ef7168eee0b62c177`**
- the same upstream commit is tagged as Rapier Rust **`v0.36.0`**

The JavaScript package version and Rust Rapier version are different version lines. Do not confuse npm `0.21.0` with the old Rust `v0.21.0` release.

## Local path

The upstream repository is mounted at:

```text
vendor/rapier/
```

After pulling a commit that adds or changes the submodule, initialize/update it with:

```powershell
git submodule update --init --recursive
```

For a fresh clone, either use:

```powershell
git clone --recurse-submodules https://github.com/bongohorse/goblin.git
```

or run the update command after cloning.

Verify the pinned revision with:

```powershell
git -C vendor/rapier rev-parse HEAD
```

Expected:

```text
b716d375efc0201003f0cd9ef7168eee0b62c177
```

## Where Codex should look first

For Rapier questions, prefer local inspection in this order:

1. **Installed package/API actually used by Goblin**
   - `node_modules/@dimforge/rapier3d-compat/`
   - `package-lock.json`
2. **Matching TypeScript/WASM bindings**
   - `vendor/rapier/bindings/typescript/src.ts/`
   - `vendor/rapier/bindings/typescript/rapier-compat/`
   - `vendor/rapier/bindings/typescript/CHANGELOG.md`
3. **Matching local user guide**
   - `vendor/rapier/website/docs/`
   - `vendor/rapier/website/docs-examples/`
4. **Rapier engine implementation**
   - `vendor/rapier/src/`
   - `vendor/rapier/crates/`
5. **Upstream examples and architecture**
   - `vendor/rapier/examples3d/`
   - `vendor/rapier/ARCHITECTURE.md`
   - `vendor/rapier/CHANGELOG.md`

Only use current online Rapier documentation or upstream `master` when the pinned local source is insufficient or when explicitly researching newer behavior.

## Authority rule

The local submodule is a reference snapshot, not executable project code.

For Goblin implementation decisions:

> **The API exposed by the installed `@dimforge/rapier3d-compat 0.21.0` package is authoritative.**

If the vendored Rust source, website guide or an online page appears to expose something that the installed JS package does not expose, do not assume it is usable. Verify the installed package before implementation.

This matters especially for:

- integration/solver parameters;
- joint and motor APIs;
- contact-force access;
- raw bindings;
- PID/controller helpers;
- features added after `js-v0.21.0`.

## Submodule policy

- Treat `vendor/rapier` as **read-only upstream reference material**.
- Do not edit files inside the submodule for Goblin changes.
- Do not move the submodule to upstream `master` casually.
- When Goblin upgrades `@dimforge/rapier3d-compat`, update this submodule deliberately to the matching `js-vX.Y.Z` tag/commit in the same scoped dependency-upgrade work.
- Record any intentional mismatch explicitly in this file.

## Why this exists

The local snapshot gives Codex fast access to the exact relevant Rapier release while working in VS Code on Windows. It reduces repeated external documentation lookups, avoids accidental use of newer APIs, and keeps physics research reproducible.
