---
name: add-hhu-util
description: >-
  Add or modify a "util" in the Hardhat repo — a small, project-independent command exposed both as a built-in Hardhat task (`hardhat utils <ns> <cmd>`) and through the standalone `hhu <ns> <cmd>` binary, defined once in the `hhu` built-in plugin. Use when adding a new util task or namespace (like `constants zero-address`, `fetch block-number`, `convert pad`), or when a util needs something new such as a flag/option.
---

# Adding a util task

Utils live in the `hhu` built-in plugin and are defined **once** as normal Hardhat tasks, then surfaced two ways from the same definitions:

- as built-in tasks under a `utils` prefix: `hardhat utils <ns> <cmd>`
- through the standalone `hhu` binary, with **no** prefix: `hhu <ns> <cmd>`

All paths below are under `packages/hardhat/`.

The feature is currently internal: the `hhu` plugin is commented out of
`builtin-plugins/index.ts` and there's no `bin.hhu`, but the source compiles and is
fully tested. Two practical consequences: tests of the `hardhat utils …` path must
register the plugin explicitly (see Testing), and the binary runs from the build —
`node packages/hardhat/dist/src/hhu.js <ns> <cmd>` — rather than a `hhu` command.

## Architecture

- **Prefix toggle.** `tasks/index.ts` exports `generateTasks({ prefixWithUtils })`. It computes the id prefix once (`["utils"]` when true, `[]` when false) and passes it to each namespace builder, which it iterates over from a `CATEGORIES` array. The Hardhat plugin (`hhu/index.ts`) calls `generateTasks({ prefixWithUtils: true })`; the `hhu` binary (`cli/hhu.ts`) calls `generateTasks({ prefixWithUtils: false })`. This is the _only_ difference between the two surfaces.
- **No HRE for `hhu`.** Creating a real HRE has a performance impact, so the `hhu` binary parses and runs tasks against a **fake HRE** (`makeStrictProxy` in `cli/hhu.ts`) fed to `TaskManagerImplementation`. The proxy throws on any property access it wasn't given, so unexpected access fails loudly instead of silently returning `undefined`.
- **Network is the exception.** The fake HRE's `network.create` lazily imports Hardhat to create a real HRE and delegates the call to it. So a util that needs the network pays the HRE cost only when it actually runs, and only network utils require a real Hardhat project.
- **Utils-flavored types (`hhu/types.ts`).** Util actions receive a _narrowed_ HRE, `UtilsHardhatRuntimeEnvironment` (currently just `network.create`), via `NewUtilsTaskActionFunction`. This is what stops a util from reaching into the full HRE (which the fake one can't provide). `FakeHhuHardhatRuntimeEnvironment` is the fake HRE's type — the utils surface **plus** the `config` the task manager needs — and the fake HRE object is checked against it with `satisfies`, so the action surface and the fake HRE can't silently drift apart.

## Adding a command to an existing namespace

1. Add the action file, e.g. `tasks/<ns>/<cmd>.ts`, default-exporting a `NewUtilsTaskActionFunction`:
   ```ts
   import type { NewUtilsTaskActionFunction } from "../../types.js";
   const action: NewUtilsTaskActionFunction = async (taskArguments, hre) => { ... };
   export default action;
   ```
2. In `tasks/<ns>/index.ts`, add the task to the returned array using **`buildUtilsTask`**, not the raw builder:
   ```ts
   buildUtilsTask(
     task([...prefix, "<ns>", "<cmd>"], "description"),
     async () => await import("./<cmd>.js"),
   );
   ```
   `buildUtilsTask` exists because the standard task builder is hardcoded to the wide `NewTaskActionFunction`; it requires the narrow action type and produces a `UtilsTaskDefinition`. Add options/positional args to the `task(...)` builder before passing it in.

## Adding a new namespace

Mirror an existing one (e.g. `tasks/fetch/`): a `<ns>/index.ts` exporting `<ns>(prefix: string[]): UtilsTaskDefinition[]` that builds the empty namespace task (`emptyTask([...prefix, "<ns>"], ...)`) plus its commands, building every id as `[...prefix, ...]`. Then add the builder to the `CATEGORIES` array in `tasks/index.ts` — that's the only wiring needed; the prefix is computed centrally and passed in.

## Conventions worth knowing

- **Avoid new external dependencies.** Prefer the standard library and `@nomicfoundation/hardhat-utils` (adding new helpers to hardhat-utils is fine). If a util genuinely seems to need a new dependency — i.e. writing it from scratch would be a very significant effort, such as a new crypto primitive — don't add it silently: stop and tell the user, and let them decide how to proceed.
- Actions print with `console.log` directly (not a passed-in writer); tests capture `console.log`.
- Network utils just call `hre.network.create()` with no args. The `--network` global option reaches it because `cli/hhu.ts` forwards it as an env var (`setGlobalOptionsAsEnvVariables({ network })`) before the real HRE is imported — don't thread `--network` into the task yourself.
- If a util needs more of the HRE than the current `UtilsHardhatRuntimeEnvironment` surface, **seek the user's approval before widening it** — broadening this surface affects every util and what the fake HRE must provide, so it's a deliberate decision, not an automatic one. Once approved, widen that type _and_ the fake HRE in `cli/hhu.ts`; the `satisfies FakeHhuHardhatRuntimeEnvironment` check will refuse to compile until both match.

## Testing

- **Test util logic as a normal Hardhat task**, not through `hhu`. Put it under `test/internal/builtin-plugins/hhu/tasks/<ns>/<cmd>.ts` (one file per util, mirroring the source layout): create a real HRE with the plugin injected (it's de-registered while internal) — `createHardhatRuntimeEnvironment({ plugins: [hhu] }, {}, process.cwd())` — run `hre.tasks.getTask(["utils", "<ns>", "<cmd>"]).run({})`, and capture output with `captureConsole()` from `@nomicfoundation/hardhat-test-utils`.
- **Only add an `hhu`-level test when the util exercises something the `hhu` path hasn't before** — e.g. a new global flag/option, or the first use of the network. A plain print-only util needs no new `hhu` test. Examples of when we did add one:
  - Adding `--network`: a `parseHhuGlobalOptions` assertion in `test/internal/cli/hhu.ts`.
  - The first network util: an end-to-end smoke test in `test/internal/cli/hhu.ts` that runs `hhu <ns> <cmd>` and exercises the fake HRE's `network.create`.
- **Network/HRE-creating `hhu` tests** need a fixture project (`useFixtureProject`, e.g. `cli/parsing/base-project`) and must call `resetGlobalHardhatRuntimeEnvironment()` afterward. They pass in the test runner (it has TS loading); the standalone binary would additionally need tsx to load a TS config — a known, separate limitation.
- **Help-snapshot gotcha.** Adding a util changes the `hhu` global-help listing, an exact-match snapshot in `test/internal/cli/hhu.ts`. Update it. (While the feature is internal, the Hardhat `main.ts` help snapshot does **not** list `utils`, so leave it alone — it only needs updating once the plugin is re-registered.) Capture exact `hhu` output by running the built binary, e.g. `node dist/src/hhu.js`, `node dist/src/hhu.js <ns> --help`.

## Verify

From the repo root, on the files you touched:

```
pnpm lint:file <paths>      # prettier + eslint (add --fix to apply)
pnpm build                  # tsc --build (run inside packages/hardhat, or via lint:file)
pnpm test:file <test paths>
```

End your report with **suggested manual testing steps** so the dev can sanity-check the
real CLI surface — the concrete command(s) to run the new util with representative
arguments/flags:

```
node packages/hardhat/dist/src/hhu.js <ns> <cmd> [args/flags]
```

For network utils, run it from inside a Hardhat project and add a TS-config loader, e.g.
`node --import tsx/esm packages/hardhat/dist/src/hhu.js fetch block-number --network <name>`.
