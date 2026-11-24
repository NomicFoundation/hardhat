---
name: bump-templates-solc
description: Update the `hardhat --init` templates and the other default solc assumptions to a new Solidity version. Use when asked to bump the templates' solc version.
---

# Bump the templates to a new solc version

This covers Hardhat 3 (`main`). Hardhat 2 (`v2` branch) needs its own, different update.

Reference PR: https://github.com/NomicFoundation/hardhat/pull/8541 (merge commit `54e9c5778` on `main`, diff it against its first parent) bumped 0.8.28 → 0.8.34. Repeat it, except its forge-std bump (commit `f53d6e79e`, plus the forge-std mention in its changeset): forge-std upgrades are their own PRs. Add the extra steps below that it did not need.

## 1. Templates and example project

Replace the old version in `packages/hardhat/templates/*` (`hardhat.config.ts` versions, `pragma solidity ^x.y.z` in `contracts/*.sol`) and in the `default` profile of `packages/example-project/hardhat.config.ts`.

Leave alone:

- the `slang` and `slang-solx` profiles in `packages/example-project/hardhat.config.ts`, plain solc entries included. Those plugins support only the versions their slang release ships (see `packages/hardhat-slang-solx/README.md`), independent of the templates. Hardhat compiles each file with the highest configured version its pragma allows, so a plain solc entry above the profile's `slang` / `slang-solx` version takes every file away from slang and the profile silently stops exercising it.
- the pragmas of `packages/example-project/contracts/*.sol`: they must stay compilable by the `slang` / `slang-solx` profiles.
- test fixtures pinned to older versions (e.g. `0.8.28` in `packages/hardhat/test`): they are not "default assumptions".

## 2. Default EVM target map (the step the reference PR didn't need)

`packages/hardhat/src/internal/builtin-plugins/solidity/build-system/solc-info.ts` has `defaultEvmTargets`, one entry per solc version. It must contain every version up to the new one, or `compilation-job.ts` sends no `evmVersion` for them.

`packages/hardhat-slang/test/evm-version.ts` asserts which versions have a default, so update it too.

Each version's value is the solc default for that release. Read the solc changelog: it changes only when a release says "Set default EVM version to X" (last time: 0.8.31 → `osaka`); otherwise copy the previous entry. If a release moves the default past `L1_LATEST_STABLE_HARDFORK` in `packages/hardhat/src/internal/builtin-plugins/network-manager/edr/types/hardfork.ts` (the enum there also lists experimental forks; those don't count), EDR has to support it first; stop and say so.

## 3. EDR support (the other step the reference PR didn't need)

From `packages/hardhat`, `node -e 'console.log(require("@nomicfoundation/edr").latestSupportedSolidityVersion())'` must print the new version or higher. No test catches a lag: coverage instrumentation silently falls back to the older grammar. If it lags, flag it in the summary (EDR needs a Slang bump) and continue.

## 4. Changeset and docs

`"hardhat": minor`, with a `#docs:` line (format in the reference PR's `.changeset/templates-solc-0-8-34.md`). The website docs show the template config and live in `NomicFoundation/hardhat-website`; the developer opens that PR and fills in the URL. Do not open any PR: only make local changes.

## 5. Verify

`pnpm -r build` first (the test spawns `pnpm hardhat compile` inside each template), then:

```
pnpm test:file packages/hardhat/test/internal/cli/init/template.ts
```

It downloads the new solc, so it fails if the version doesn't exist yet on the solc binaries list.

Then, from `packages/example-project`, run `pnpm hardhat build --force --build-profile slang` and `--build-profile slang-solx`. The `^0.8.x` files must still compile with `slang … (Solidity <slang version>)` / `slang-solx … (Solidity <slang version>)`, not with the new solc.

## 6. Verify through Verdaccio

The template test uses workspace links. This runs the published packages the way a user gets them.

Verdaccio is a root devDependency. Run `test -d node_modules/verdaccio` from the repo root first; if it is missing, stop and ask the user to approve `pnpm install` before continuing.

```
pnpm verdaccio start --background
pnpm verdaccio publish --since-release
```

Then, in an empty directory outside the repo, once per template (`node-test-runner-viem`, `mocha-ethers`, `minimal`):

```
export npm_config_registry=http://127.0.0.1:4873 npm_config_prefer_online=true
npx -y hardhat@latest --init --template <name>
npm ls hardhat
npx hardhat compile && npx hardhat test
```

`npm ls hardhat` must show the version `publish` printed (a minor above npm's), not npm's release; `prefer_online` keeps npm from reusing a stale cached tarball of that same version from an earlier run. The compile line must name the new solc (`minimal` has no contracts). Read the output for new warnings: nothing asserts on them.

Clean up. `--since-release` rewrites `package.json` versions and `pnpm-lock.yaml`; restore them:

```
pnpm verdaccio stop
git checkout -- pnpm-lock.yaml 'packages/*/package.json'
```
