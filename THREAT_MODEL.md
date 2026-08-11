# Threat model

This document defines how security findings in this repository are **rated and reported**. A security analysis MUST read it in full before starting and treat the rules below as binding.

It places **no limits on what may be investigated** — every code path is fair game. Never skip or cut short a code path because the outcome is predicted to be LOW: severity cannot be known before understanding what the code actually does. Explore first, rate afterwards.

## What Hardhat is, for the purposes of this model

Hardhat is a local development tool for smart contracts, run on a developer's machine or in CI with that user's privileges. Users routinely clone third-party projects and run Hardhat on them, run Hardhat in CI against untrusted pull requests, and store encrypted keys and secrets in a keystore.

## The one rule

**Decide severity by whether a finding gives the attacker a NEW capability they did not already have — not by how much access you imagine the attacker has.**

To apply it you must know what each attacker starts with. The baselines below are rungs on a ladder from least capability to most: a finding matters when it moves an attacker **up** a rung. When rating, pick the **weakest** rung from which the bug is still triggerable — assuming a stronger attacker than the bug requires is the most common way to wrongly dismiss a valid finding.

### Baseline 1 — controls a network response

Controls only the bytes coming back over the wire (compiler downloads, `hardhat verify` responses, JSON-RPC when forking, telemetry, hardware-wallet endpoints). No account on the machine, no presence in the project. Integrity checks on these paths (e.g. compiler downloads verified against a published SHA-256) are **meant to hold against it**. Anything that lets a network response change what code runs, what gets written outside the project, or what gets sent out is an escalation from nothing — never down-rank it with config-execution reasoning, which requires an attacker this one is not.

### Baseline 2 — controls only the project's *data*

Can write Solidity sources, imports, remappings, `artifacts/`, `build-info`, or cache — but **not** `hardhat.config.ts` or plugins. (Dependency manifests and lockfiles are the exception: controlling them chooses which packages load, i.e. code execution, so treat that as Baseline 3.) This is a fork PR, a dependency's vendored sources, or CI running trusted config against untrusted sources.

**This is not a code-execution baseline, and keeping it that way is a boundary Hardhat must hold.** A path that turns "can write a `.sol` file" or "can write an artifact" into code execution, a write outside the project, or a read of a file the project should never see IS a real escalation. Do not collapse this rung into Baseline 3 merely because both involve "an untrusted project."

### Baseline 3 — controls the project's config or plugins

Hardhat loads and executes the project's `hardhat.config.ts` and plugins as the user — intended, unavoidable behavior. So this attacker **already has arbitrary code execution**: they can read, write, delete, exfiltrate, and run anything the user can.

A finding that genuinely *requires* config control is therefore **not an escalation on its own** — LOW / defense-in-depth — unless it adds a capability config execution does not (see below). Before down-ranking, confirm the finding really needs config control: if a Baseline 2 or Baseline 1 attacker can reach the same code, rate it at that weaker rung instead.

### Baseline 4 — already running code as the user

Can do almost anything; the general fact of that access is not a Hardhat vulnerability. Two things this rung does **not** cover:

- **A different, less-privileged user on the same machine** (co-tenant on a shared CI runner or dev box). They are closer to Baseline 1. Predictable temp paths, world-writable output dirs, and symlink races in the artifacts/cache pipeline are genuine findings against them.
- **Boundaries designed to hold even against a same-user attacker** — the encrypted keystore above all. Defeating such a boundary is valid regardless of assumed access (rule 3).

## What escalates past config execution

The Baseline 3 down-rank is the easiest rule here to over-apply. These capabilities are **not** part of "the config already runs code," so a finding that provides one is an escalation even when the attacker also controls the config:

- **Effects outside the project directory** — writes, reads, or state changes in the global cache, `~/.config/hardhat`, temp dirs, or another project's files.
- **Persistence** — anything that still affects the user after the malicious project is deleted, or poisons a later run of an unrelated project.
- **Secret disclosure** — keystore contents, decrypted secrets, or configuration variables the project was never granted.
- **Triggering before or without config execution** — a path that fires from a command or context where the config has not been loaded and run.
- **Crossing into another trust domain** — causing a request, transaction, or submission to go somewhere the user did not intend.

If a finding fits none of these, the down-rank is probably correct. If it fits one, name which and rate it on its own merits.

## Assets to protect

In rough order: (1) private keys and secrets, especially the encrypted keystore and any decrypted copies; (2) the user's machine and files — nothing read, written, or deleted outside the project beyond intent; (3) downstream-published outputs that leave the machine (build-info uploaded to CI, source/metadata sent to block explorers by `hardhat verify`) — these are exfiltration channels; (4) integrity of the build.

## Rules for judging findings

1. **Rate by escalation, not by assumed access.** HIGH/MEDIUM only if the finding grants a capability the attacker did not already have. If an intended path already grants an equal-or-greater capability, it is LOW / defense-in-depth — and name that stronger capability when you down-rank.

2. **Do NOT justify low severity with "the attacker would need full control of the machine."** Almost always wrong: most findings need only the victim to run Hardhat on untrusted input, which is normal usage. And if an attacker truly has full machine control, there is usually no vulnerability to report — except a boundary meant to hold even against them (rule 3).

3. **A finding IS valid when it defeats a boundary meant to hold even against a local attacker.** The keystore is encrypted at rest, so reading the keystore file without the password reveals nothing (that boundary holds — not a finding). But if a *decrypted* secret escapes somewhere observable — a log, error message, temp file, environment variable, child-process arguments, or a network request — that defeats the boundary and IS a finding. Judge by observable egress, not in-memory lifetime: JS strings cannot be reliably zeroed, so "held in memory too long" is not on its own reportable.

4. **Report concrete, exploitable issues, not style nits.** For each finding, describe a plausible attacker, the precondition they need, and the concrete bad outcome. If you cannot, it is not a finding.
