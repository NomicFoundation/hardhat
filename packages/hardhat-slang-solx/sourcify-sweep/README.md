# Sourcify sweep for hardhat-slang-solx

Compiles real-world Sourcify-verified contracts through the `hardhat-slang-solx` plugin, end to end: each corpus contract becomes a self-contained Hardhat project which is built with the `slangSolx` profile (solx). Failures are re-built with the stock solc `default` profile — a contract that also fails with solc is a harness/reconstruction artifact, not a solx failure, so genuine regressions surface as `solx-only-fail`.

Not published to npm and not part of the package build; the scripts run with `tsx` against the workspace `hardhat` and this plugin's `dist/`, so build the workspace first (`pnpm build`).

## Usage

The full-corpus sweep can also run in CI: label a PR with `sourcify-sweep` (or dispatch `.github/workflows/sourcify-sweep.yml` manually) to compile the whole pinned corpus across 16 shards and get the outcome breakdown in the run summary. The corpus release asset is pinned (URL + sha256) in `corpus-pin.txt`; bump the pin to sweep a new corpus. Re-label after e.g. a solx version bump to re-run.

```bash
# Smoke run over the committed fixtures (10 contracts, one per layout class):
pnpm sourcify-sweep

# Full corpus (see "Corpus" below), 8-way CI-style sharding:
pnpm sourcify-sweep --corpus <corpus-dir> --out results.jsonl \
  --shard-count 8 --shard-index 0

# Summarize any results file:
pnpm sourcify-sweep:report --results results.jsonl
```

The runner is resumable (contracts already present in `--out` are skipped), bounds each build with `--timeout-s` (default 300), and keeps the generated project on disk for any failing contract (under `--workdir`) for debugging. Exit code is non-zero iff any `solx-only-fail` occurred.

## Corpus

A corpus is a directory with a `corpus.json` manifest and one JSON per contract under `contracts/`, in slang's Sourcify corpus format (format_version 1) plus a `settings` field carrying the contract's original solc `compiler_settings` (evmVersion, optimizer, viaIR, libraries, remappings).

The reference corpus is all Sourcify contracts compiled with solc 0.8.34 and evmVersion >= cancun (explicit cancun/prague/osaka or the compiler default) — the exact set this plugin's `SOLIDITY_TO_SOLX_VERSION_MAP` and `SUPPORTED_SOLX_EVM_VERSIONS` can compile. It is extracted from Sourcify's public BigQuery dataset with `bigquery/extract_0834.sql`: 112,587 unique contracts (perfect runtime match, all chains, deduplicated by fully-qualified name + source-set hashes, canonical deployment prefers mainnet, source sets over 8 MB skipped).

The committed `fixtures/` corpus is a 10-contract subset, one per fixture generation class below, including one known `harness-fail`: solc accepts whitespace inside pragma version literals (`pragma solidity ^ 0.8 .0;`) but Hardhat's pragma matching does not, see https://github.com/NomicFoundation/hardhat/issues/8535.

## Fixture generation

Rules validated on a 100-contract stratified pilot (over-sampling remappings, @-scoped paths, viaIR, libraries, URL imports and p99-size contracts; 99/100 compiled, zero solx-specific failures):

- Contracts verified from a Hardhat 3 project (target under `project/`) are reconstructed as real projects: `project/` at the source root, `npm/<name>@<version>/` and other vendored top-level trees as synthesized `node_modules` packages, no remappings — Hardhat resolves natively.
- Everything else: sources verbatim under `s/<virtual path>`; `remappings.txt` is the contract's own remappings (targets re-rooted under `s/`) plus an identity remapping `P/=s/P/` per top-level prefix, the form Hardhat itself suggests for direct imports of project files.
- URL-style virtual paths (`https://...`) are sanitized to plain paths, with exact quoted occurrences rewritten in the sources.
- The `slangSolx` profile only receives `evmVersion` and `libraries`: solc's optimizer settings don't map onto solx's LLVM -O modes, so the plugin default applies. The solc baseline profile gets the original settings.
