---
name: mocha-to-node-test
description: Migrates Mocha.js test files to Node.js native test runner (node:test). Use when user asks to "migrate tests from Mocha to node:test", "convert Mocha tests to native test runner", "replace Mocha with node:test", or "migrate to node:test". Handles imports, hooks, timeouts, context sharing, test modifiers, and CLI configuration. Does not migrate assertion libraries.
---

# Migrating Mocha.js Tests to Node.js Native Test Runner (`node:test`)

## Overview

This skill guides the migration of test files from Mocha.js to Node.js's built-in test runner (`node:test`), available from Node.js 18+ and stable in Node.js 20+. This guide targets Node.js 22+.

This skill focuses exclusively on test runner migration. Assertion library migration (e.g., Chai to `node:assert`) is out of scope.

## Critical: Pre-Migration Communication

Before starting the migration, inform the user about the following. Ask for direction on any that apply to their codebase.

### Features with no direct `node:test` equivalent

1. **`this` context sharing** between hooks and tests — must be refactored to closures. If the codebase uses helpers that assign fields to `this`, ask the user for directions on how to refactor them.
2. **`.retries(n)`** — no built-in equivalent. Ask the user before implementing a retry wrapper.
3. **`--bail`** — no built-in equivalent CLI flag.
4. **Root hook plugins** (`mochaHooks` export pattern) — no equivalent; must refactor to shared helpers imported per-file, or use `--import`.
5. **Mocha's TDD/Exports/QUnit/Require interfaces** — must be converted to BDD-style `describe`/`it`.
6. **`context()` alias** — replace with `describe()`.
7. **Named hooks** (e.g., `beforeEach("name", fn)`) — remove the name argument, preserve as a comment.
8. **Custom Mocha reporters** — must be rewritten for `node:test`'s stream-based reporter API.
9. **`.mocharc.*` configuration files** — must be moved to CLI flags or scripts.
10. **Browser test support** — `node:test` is Node.js only.

### Important behavioral differences to communicate

1. **`.only` requires a CLI flag:** `.only` is ignored unless `--test-only` is passed. This prevents accidentally committing `.only` and silently skipping tests in CI. If the codebase uses `.only`, inform the user they need `--test-only` when running tests locally.
2. **Process isolation by default:** `node:test` runs each test file in a separate child process. Global state does not leak between files, but startup cost per file is higher. Inform the user about `--test-isolation=none` for behavior closer to Mocha's default.
3. **`done` callback signature change:** In `node:test`, the test context `t` is always the first parameter and `done` is the second. In Mocha, `done` is the first parameter.
4. **`.todo` executes the body:** `it.todo("name", fn)` **runs `fn`** but ignores failures. In Mocha, pending tests (no body) are simply not executed.
5. **Async describe:** Mocha doesn't officially support `async` describe callbacks, but some codebases use them accidentally. `node:test` properly supports them — `it` calls within don't need to be `await`ed.
6. **New capabilities:** `node:test` offers built-in mocking (`mock` from `node:test`), built-in code coverage (`--experimental-test-coverage`), snapshot testing (`t.assert.snapshot()`), test plans (`t.plan(n)`), and within-file concurrency (`{ concurrency: N }`). Inform the user about these if relevant.

> For a detailed feature-by-feature comparison table, see `references/feature-comparison.md`.

## Instructions

When asked to migrate a Mocha test file (or codebase) to `node:test`, follow these rules:

### 1. Imports

Replace Mocha imports with `node:test` imports.

```js
// Before (Mocha)
const { describe, it } = require("mocha");
// or Mocha globals (no import needed)

// After (node:test)
const {
  describe,
  it,
  before,
  after,
  beforeEach,
  afterEach,
} = require("node:test");
// or with ESM
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
```

> **Note:** In Mocha, `describe`, `it`, `before`, `after`, `beforeEach`, and `afterEach` are injected as globals. In `node:test`, they must be explicitly imported.

### 2. Basic Test Structure (`describe` / `it`)

The basic structure is identical. No changes needed.

```js
describe("MyModule", () => {
  it("should do something", () => {
    assert.strictEqual(1, 1);
  });
});
```

### 3. Hooks (`before`, `after`, `beforeEach`, `afterEach`)

The API is the same. Ensure they are imported from `node:test`.

```js
import { describe, it, before, after, beforeEach, afterEach } from "node:test";

describe("suite", () => {
  before(() => {
    /* runs once before all tests */
  });
  after(() => {
    /* runs once after all tests */
  });
  beforeEach(() => {
    /* runs before each test */
  });
  afterEach(() => {
    /* runs after each test */
  });

  it("test", () => {});
});
```

#### Named Hooks

In Mocha, hooks accept an optional description string as the first argument:

```js
// Mocha
beforeEach("Load environment", async function () { ... });
```

`node:test` does **not** support named hooks. Remove the name argument and add it as a comment instead:

```js
// node:test
// Load environment
beforeEach(async () => { ... });
```

### 4. Shared State via `this` Context

Mocha allows sharing state between hooks and tests via `this` (requires `function` keyword, not arrow functions):

```js
// Mocha
describe("suite", function () {
  beforeEach(function () {
    this.server = createServer();
  });

  it("test", function () {
    this.server.listen();
  });
});
```

**`node:test` does not support shared `this` context.** Use closures with `let` variables instead:

```js
// node:test
describe("suite", () => {
  let server;

  beforeEach(() => {
    server = createServer();
  });

  it("test", () => {
    server.listen();
  });
});
```

> **Migration note:** If the codebase extends the Mocha context interface (e.g., `declare module "mocha" { interface Context { ... } }`), remove those declarations and refactor all `this.xxx` references to use closure variables.

> **Migration note:** If the codebase uses helpers that assign fields to `this`, ask the user for directions on how to refactor them.

### 5. Test Modifiers: `.only`, `.skip`, `.todo`

#### `.skip`

Works the same way syntactically.

```js
describe.skip("skipped suite", () => { ... });
it.skip("skipped test", () => { ... });
```

You can also skip programmatically inside a test:

```js
it("conditionally skipped", (t) => {
  if (someCondition) t.skip("reason");
});
```

> **Migration note:** If the skip condition isn't related to the test iself (e.g. depending on the environment), use the `{skip: condition}` option instead.

#### `.only`

The syntax is the same, but the behavior is different.

```js
describe.only("exclusive suite", () => { ... });
it.only("exclusive test", () => { ... });
```

**Key difference:** In Mocha, `.only` works automatically. In `node:test`, `.only` is **ignored by default** unless:

- The `--test-only` CLI flag is passed, or
- Test isolation is set to `none`

When running tests, use:

```bash
node --test --test-only
```

#### `.todo`

Mocha has **pending tests** (tests without a body). `node:test` has `.todo`:

```js
// Mocha - pending test
it("should do something eventually");

// node:test - todo test
it.todo("should do something eventually");
```

**Key difference:** In `node:test`, `.todo` tests that have a body **are executed**, but failures are not treated as test failures. In Mocha, pending tests without a body are simply skipped.

Pending tests without a body should be migrated to `it.todo(name)` (without a callback).

### 6. Timeouts

Mocha supports timeouts at multiple levels using `this.timeout()`:

```js
// Mocha
describe("suite", function () {
  this.timeout(5000); // suite-level

  it("slow test", function () {
    this.timeout(10000); // test-level
  });
});
```

In `node:test`, timeouts are set via the options object:

```js
// node:test
describe("suite", { timeout: 5000 }, () => {
  it("slow test", { timeout: 10000 }, () => {});
});
```

**Key difference:** `node:test` does not support `this.timeout()`. The timeout must be specified as an option in the second argument. Hooks also support `{ timeout }`:

```js
before({ timeout: 3000 }, () => { ... });
```

**Global timeout** can be set via CLI:

```bash
node --test --test-timeout=5000
```

### 7. Retries

Mocha supports automatic test retries:

```js
// Mocha
describe("suite", function () {
  this.retries(3);

  it("flaky test", function () { ... });
});
```

**`node:test` has no built-in retry mechanism.** If retries are needed, implement them manually:

```js
// node:test - manual retry wrapper
import { it } from "node:test";

function itWithRetries(name, options, fn, retries = 3) {
  if (typeof options === "function") {
    fn = options;
    options = {};
  }
  it(name, options, async (t) => {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await fn(t);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  });
}
```

> **Migration note:** Ask the user for direction before automatically implementing retries.

### 8. Async Patterns

Both runners support `async/await` and returned Promises identically.

```js
it("async test", async () => {
  const result = await fetchData();
  assert.strictEqual(result, expected);
});
```

#### `done` Callback

Both Mocha and `node:test` support callback-style async:

```js
// Mocha
it("callback test", function (done) {
  doSomething(done);
});

// node:test
it("callback test", (t, done) => {
  doSomething(done);
});
```

**Key difference:** In `node:test`, the test context `t` is always the first parameter, and `done` is the second. In Mocha, `done` is the first (and only) parameter.

### 9. Dynamic Test Generation

Both frameworks support generating tests dynamically in loops:

```js
const cases = [
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
];

describe("double", () => {
  for (const { input, expected } of cases) {
    it(`should double ${input}`, () => {
      assert.strictEqual(input * 2, expected);
    });
  }
});
```

This pattern works identically in both frameworks.

#### Async `describe` Callbacks

Mocha doesn't work well with `async` callbacks in `describe` blocks, this may or may not work. It's best to avoid them, but some codebases use it accidentally.

```js
// Mocha
describe("suite", async () => {
  const data = await loadFixture();
  it("test", () => { ... });
});
```

**`node:test` does supports `async` describe callbacks**, if an `async` callback is used, keep it unchanged. The `it` calls within it don't need to be `await`ed despite returning a `Promise`. Only tests within tests need to be `await`ed.

### 10. Test Filtering

```bash
# Mocha
mocha --grep "pattern"       # regex filter
mocha --fgrep "string"       # fixed string filter

# node:test
node --test --test-name-pattern="pattern"    # regex filter
node --test --test-skip-pattern="pattern"    # skip by pattern
```

**Key difference:** `node:test` does not have a fixed-string filter (`--fgrep`). Use regex patterns instead. `node:test` also supports `--test-skip-pattern` for excluding tests, which Mocha does not have (Mocha uses `--grep --invert`).

### 11. Test File Discovery and Execution

```bash
# Mocha - explicit glob patterns
mocha "test/**/*.test.js"

# node:test - built-in default patterns
node --test
# Matches: **/*.test.{js,mjs,cjs}, **/*-test.*, **/*_test.*, **/test-*.*, **/test/**/*.*
```

**Key differences:**

- Mocha requires explicit file patterns (or uses config defaults).
- `node:test` has built-in default patterns. You can override them: `node --test "**/*.spec.js"`
- **Process isolation:** `node:test` runs each test file in a **separate child process** by default. Mocha runs all files in the **same process** by default.

### 12. Reporters

```bash
# Mocha
mocha --reporter spec
mocha --reporter dot
mocha --reporter nyan
mocha --reporter json

# node:test
node --test --test-reporter=spec
node --test --test-reporter=tap
node --test --test-reporter=dot
node --test --test-reporter=junit
```

**Key differences:**

- `node:test` built-in reporters: `spec`, `tap`, `dot`, `junit`, `lcov`.
- Mocha has more built-in reporters: `spec`, `dot`, `nyan`, `landing`, `list`, `progress`, `json`, `json-stream`, `min`, `doc`, `markdown`, `html`, `xunit`, `tap`.
- Custom Mocha reporters cannot be reused with `node:test`. They must be rewritten using `node:test`'s stream-based reporter API.
- `node:test` supports multiple reporters simultaneously via `--test-reporter` and `--test-reporter-destination`.

### 13. Configuration Files

Mocha reads configuration from `.mocharc.yml`, `.mocharc.json`, `.mocharc.js`, or `package.json` (`mocha` key).

**`node:test` has no dedicated configuration file format.** All options are set via:

- CLI flags
- The `run()` API in a script
- `package.json` `scripts`

### 14. Parallel Execution

```bash
# Mocha
mocha --parallel

# node:test
node --test --test-concurrency=4
```

**Key behavioral differences:**

| Feature | Mocha | `node:test` |
| --- | --- | --- |
| Default behavior | All files in one process, sequential | Each file in separate process |
| Parallel mode | `--parallel` flag, uses worker threads | `--test-concurrency=N` for file-level parallelism |
| Within-file concurrency | Not supported | `{ concurrency: N }` option on `describe`/`test` |
| Isolation model | Shared process (even in parallel, state can leak via root hooks) | Process-per-file by default, or `--test-isolation=none` for shared |
| Root hook sharing in parallel | Via `--require` with root hook plugins | Not applicable (separate processes) |

### 15. `--bail` (Fail-Fast)

```bash
# Mocha
mocha --bail
```

**`node:test` does not have a `--bail` flag.** There is no built-in way to abort the entire test run on the first failure. You can approximate this behavior using the `run()` API and listening for `test:fail` events, but there is no CLI equivalent.

### 16. Root-Level Hooks and Global Setup

In Mocha, you can use `--file` to load a setup module before tests, or `--require` with root hook plugins:

```js
// Mocha root hook plugin (for --require)
module.exports = {
  mochaHooks: {
    beforeAll() { ... },
    afterAll() { ... },
    beforeEach() { ... },
    afterEach() { ... },
  },
};
```

In `node:test`, global setup/teardown can be done via:

- `--import` or `--require` to preload modules
- `globalSetup` and `globalTeardown` options in the `run()` API

```bash
# Mocha
mocha --file test/setup.js --require test/root-hooks.js

# node:test
node --test --import ./test/setup.js
```

**Key difference:** There is no equivalent to Mocha's root hook plugins (`beforeEach`/`afterEach` applied globally across all files). In `node:test`, hooks are scoped to their `describe`/`test` block. To share setup across files, use `--import` to load a module that performs global setup, or create a shared helper that each test file imports.

### 17. Watch Mode

```bash
# Mocha
mocha --watch

# node:test
node --test --watch
```

Both support watch mode with similar behavior. **Key difference:** Mocha's watch mode supports `--watch-files` and `--watch-ignore` globs. `node:test`'s watch mode watches the test files and their dependencies automatically.

### 18. Code Coverage

```bash
# Mocha (requires external tool)
nyc mocha "test/**/*.js"
# or
c8 mocha "test/**/*.js"

# node:test (built-in)
node --test --experimental-test-coverage
```

`node:test` has **built-in code coverage** support (no external tools needed). It supports `--test-coverage-include` and `--test-coverage-exclude` globs, and minimum coverage thresholds via the `run()` API. It also works well with `nyc` and `c8`.

> **Migration note:** If the codebase uses an external code coverage tool (e.g., `nyc`), ask the user if they want to migrate to `node:test`'s built-in code coverage.

### 19. Built-in Mocking

`node:test` includes a built-in mocking library. If the Mocha codebase uses an external mocking library (e.g., Sinon), you may optionally migrate to `node:test`'s built-in mocking:

```js
import { mock } from "node:test";

// Create a mock function
const fn = mock.fn();

// Mock a method on an object
mock.method(obj, "methodName", () => "mocked");

// Mock timers
mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
mock.timers.tick(1000);

// Reset all mocks
mock.reset();
```

Or use `t.mock` within a test for automatic cleanup:

```js
it("test with mock", (t) => {
  const fn = t.mock.fn();
  // Automatically cleaned up after this test
});
```

> **Note:** Migrating mocking libraries is optional and orthogonal to the test runner migration. Just inform the user, but don't migrate at this time.

### 20. Mocha-Specific Interfaces

Mocha supports multiple interfaces: BDD (`describe`/`it`), TDD (`suite`/`test`), Exports, QUnit, Require.

**`node:test` only provides one interface** that maps to Mocha's BDD interface (`describe`/`it`) and a `test()` function. If the codebase uses TDD or other Mocha interfaces, convert them:

```js
// Mocha TDD interface
suite("MySuite", () => {
  suiteSetup(() => { ... });    // → before()
  suiteTeardown(() => { ... }); // → after()
  setup(() => { ... });          // → beforeEach()
  teardown(() => { ... });       // → afterEach()
  test("my test", () => { ... }); // → it()
});
```

### 21. `context()` Alias

In Mocha, `context()` is an alias for `describe()`:

```js
// Mocha
context("when logged in", () => { ... });
```

**`node:test` does not have `context()`.** Replace with `describe()`:

```js
// node:test
describe("when logged in", () => { ... });
```

## Step-by-Step Migration Checklist

Before migrating, review the "Critical: Pre-Migration Communication" section above. Inform the user about any items that apply to their codebase and ask for direction where noted.

Then, for each test file:

1. Replace Mocha imports/globals with explicit `node:test` imports.
2. Replace `context()` calls with `describe()`.
3. Convert `this.timeout(ms)` to `{ timeout: ms }` options.
4. Refactor `this`-based context sharing to closure variables. If the codebase uses helpers that assign fields to `this`, ask the user for direction.
5. Remove named hook arguments (first string parameter) and preserve them as comments.
6. Convert pending tests (`it("name")`) to `it.todo("name")`.
7. Add `t` parameter before `done` in callback-style tests.
8. Remove `.retries()` calls. Ask the user before implementing a retry wrapper.
9. If using TDD or other Mocha interfaces, convert to `describe`/`it`.

Then, for the project as a whole:

10. Replace `.mocharc.*` config with CLI flags in `package.json` scripts.
11. Replace `--grep`/`--fgrep` with `--test-name-pattern`.
12. Replace `--bail` with alternative approach or remove.
13. Update CI scripts to use `node --test` instead of `mocha`.
14. If using `--parallel`, switch to `--test-concurrency=N`.
15. If using Mocha reporters, switch to `node:test` built-in reporters or rewrite custom ones.
16. If using `nyc` or `c8`, ask the user if they want to migrate to `node:test`'s built-in coverage.
17. Inform the user that `.only` now requires the `--test-only` flag.
18. Remove Mocha from `devDependencies`.

## Examples

### Example 1: Simple test file migration

User says: "Migrate this Mocha test file to node:test"

Before (Mocha):
```js
const { expect } = require("chai");

describe("Calculator", function () {
  this.timeout(5000);

  let calc;

  beforeEach("setup calculator", function () {
    calc = new Calculator();
    this.initialValue = 0;
  });

  context("when adding numbers", function () {
    it("should add two numbers", function () {
      expect(calc.add(1, 2)).to.equal(3);
    });

    it.skip("should handle negative numbers", function () {
      expect(calc.add(-1, -2)).to.equal(-3);
    });

    it("should handle large numbers");
  });
});
```

After (node:test):
```js
const { describe, it, beforeEach } = require("node:test");
const { expect } = require("chai");

describe("Calculator", { timeout: 5000 }, () => {
  let calc;
  let initialValue;

  // setup calculator
  beforeEach(() => {
    calc = new Calculator();
    initialValue = 0;
  });

  describe("when adding numbers", () => {
    it("should add two numbers", () => {
      expect(calc.add(1, 2)).to.equal(3);
    });

    it.skip("should handle negative numbers", () => {
      expect(calc.add(-1, -2)).to.equal(-3);
    });

    it.todo("should handle large numbers");
  });
});
```

Actions taken:
1. Added explicit `node:test` imports
2. `this.timeout(5000)` → `{ timeout: 5000 }` option
3. `this.initialValue` → `let initialValue` closure variable
4. `function()` → `() =>` (arrow functions, since `this` is no longer needed)
5. Named hook `"setup calculator"` → comment
6. `context()` → `describe()`
7. Pending test `it("should handle large numbers")` → `it.todo(...)`

### Example 2: Test with done callback

Before (Mocha):
```js
it("should emit event", function (done) {
  emitter.on("data", function (result) {
    expect(result).to.equal("hello");
    done();
  });
  emitter.emit("data", "hello");
});
```

After (node:test):
```js
it("should emit event", (t, done) => {
  emitter.on("data", (result) => {
    assert.strictEqual(result, "hello");
    done();
  });
  emitter.emit("data", "hello");
});
```

Action: Added `t` as first parameter before `done`.

### Example 3: Project-wide configuration migration

Before (`.mocharc.json`):
```json
{
  "extension": ["ts"],
  "loader": "ts-node/esm",
  "timeout": 25000,
  "file": "./test/setup.ts",
  "recursive": true,
  "spec": "test/**/*.test.ts"
}
```

After (`package.json` scripts):
```json
{
  "scripts": {
    "test": "node --import tsx --test --test-timeout=25000 --import ./test/setup.ts 'test/**/*.test.ts'"
  }
}
```

Actions: `.mocharc.json` deleted, all options moved to CLI flags. `ts-node/esm` replaced with `tsx` (or similar loader). `--file` replaced with `--import`.

## Troubleshooting

### Tests are silently skipped when using `.only`

**Cause:** `node:test` ignores `.only` unless `--test-only` is passed.

**Solution:** Run with `node --test --test-only`. Inform the user about this behavioral difference.

### `this` is `undefined` in test callbacks

**Cause:** Arrow functions don't have their own `this`. After migration, if any `this.xxx` references remain, they will be `undefined`.

**Solution:** Search for remaining `this.` references in test files and convert them to closure variables.

### Tests run but hooks from other files don't apply

**Cause:** `node:test` runs each file in a separate process by default. Root hook plugins from Mocha don't carry over.

**Solution:** Each file must import its own setup, or use `--import` to preload a global setup module.

### `done is not a function` error

**Cause:** In `node:test`, `done` is the second parameter, not the first. If you write `it("test", (done) => { done() })`, the first argument is actually the test context `t`, not `done`.

**Solution:** Change to `it("test", (t, done) => { done() })`.

### Tests run twice or produce unexpected output

**Cause:** Running `node --test` on a file that also gets imported by another test file, or file matching both explicit patterns and default patterns.

**Solution:** Check `node --test` file matching patterns. Use `--test-skip-pattern` to exclude files, or be explicit about which files to run.
