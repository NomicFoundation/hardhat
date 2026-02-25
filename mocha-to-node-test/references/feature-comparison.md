# Mocha vs `node:test` Feature Comparison

| Feature | Mocha | `node:test` | Migration |
| --- | --- | --- | --- |
| `describe` / `it` | Yes | Yes | Direct |
| `before`/`after`/`beforeEach`/`afterEach` | Yes (global) | Yes (import required) | Add imports |
| `.only` | Works automatically | Requires `--test-only` flag | Behavioral change |
| `.skip` | Yes | Yes | Direct |
| `.todo` / pending tests | Pending (no body) | `.todo` (body is executed but failures ignored) | Change syntax |
| Timeouts | `this.timeout(ms)` | `{ timeout: ms }` option | Rewrite |
| Retries | `this.retries(n)` | Not supported | Manual wrapper or remove |
| `done` callback | `function(done)` | `(t, done) =>` | Add `t` parameter |
| `this` context sharing | Yes | Not supported | Use closures |
| Named hooks | Yes | Not supported | Remove name argument |
| Test filtering | `--grep` / `--fgrep` | `--test-name-pattern` / `--test-skip-pattern` | Update CLI |
| `--bail` | Yes | Not supported | Remove or workaround |
| Configuration file | `.mocharc.*` | None | Move to CLI flags / scripts |
| Root hook plugins | `--require` with `mochaHooks` | Not supported | Refactor to per-file setup |
| Multiple interfaces (TDD, etc.) | Yes | No (BDD-like only) | Convert to `describe`/`it` |
| `context()` alias | Yes | No | Replace with `describe()` |
| Browser support | Yes | No | Not migratable |
| Process isolation | Shared by default | Per-file by default | Behavioral change |
| Within-file concurrency | No | Yes (`{ concurrency }`) | New capability |
| Built-in coverage | No (needs nyc/c8) | Yes (`--experimental-test-coverage`) | New capability |
| Built-in mocking | No (needs Sinon, etc.) | Yes (`mock` from `node:test`) | New capability |
| Snapshot testing | No (needs plugin) | Yes (`t.assert.snapshot()`) | New capability |
| `t.plan(n)` | No | Yes | New capability |
