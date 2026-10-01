# Hardhat threat model

This document defines how security findings in this repository are **rated and reported**. Read it in full before starting a security analysis and treat every rule below as binding.

Every code path is in scope. Never skip or cut short a path because you expect the result to be Low severity: understand the behavior first and rate it afterward.

## Core rule

**Rate a finding by whether it gives the attacker a new capability, not by how much access you imagine the attacker has.**

The baselines below form a ladder from least capability to most. Use the **weakest baseline that can trigger the bug**. Assuming a stronger attacker than the bug requires is the most common way to dismiss a valid finding.

## Hardhat's security context

Hardhat is a local smart-contract development tool. It runs on a developer's machine or in CI with that user's privileges. Users routinely:

- clone third-party projects and run Hardhat on them
- run Hardhat in CI against untrusted pull requests
- store encrypted keys and secrets in a keystore

## Attacker baselines

Reports name each attacker by the exact label below.

| Attacker | Report label |
| --- | --- |
| Baseline 1 | Someone who controls a network response |
| Baseline 2 | Someone who controls a project's files but not its config |
| Baseline 3 | Someone who controls a project's config or plugins |
| Baseline 4 | Someone already running code as you |
| [Another local user](#another-local-user-is-not-baseline-4) | Another user on the same computer |

### Baseline 1 — controls a network response

This attacker controls only bytes returned over the wire, such as compiler downloads, `hardhat verify` responses, JSON-RPC responses during forking, telemetry responses, or hardware-wallet endpoints. They have no account on the machine and no presence in the project.

Integrity checks on these paths, such as checking a compiler download against a published SHA-256 hash, are intended to resist this attacker. If a network response can produce any outcome under [Forbidden outcomes for Baselines 1 and 2](#forbidden-outcomes-for-baselines-1-and-2), the result is an escalation from nothing. Never down-rank it using config-execution reasoning; this attacker does not control the config.

### Baseline 2 — controls only project data

This attacker can write Solidity sources, imports, remappings, `artifacts/`, `build-info`, or cache data, but cannot write `hardhat.config.ts` or plugins. Examples include a fork pull request, vendored source files from a dependency, or CI running trusted config against untrusted sources.

Dependency manifests and lockfiles are the exception: controlling them selects which packages load and therefore provides code execution. Treat that control as Baseline 3.

**Baseline 2 does not include code execution, and Hardhat must preserve that boundary.** If a `.sol` file, artifact, or other data produces a forbidden outcome, the result is a real escalation. Do not collapse this baseline into Baseline 3 merely because both can involve an "untrusted project."

### Baseline 3 — controls project config or plugins

Hardhat intentionally loads and executes the project's `hardhat.config.ts` and plugins as the user. This attacker already has arbitrary code execution: they can read, write, delete, exfiltrate, and run anything the user can, inside or outside the project, now or later.

An issue that genuinely requires config control is therefore an **already-compromised issue**, not a rated finding, unless it defeats a boundary in [Boundaries that survive same-user code execution](#boundaries-that-survive-same-user-code-execution).

Before using this classification, confirm that config control is necessary. If a Baseline 1 or 2 attacker can reach the same code, or the path runs in a command or context where config has not been loaded and executed, rate it from that weaker baseline.

### Baseline 4 — already running code as the user outside Hardhat

This attacker's code already runs, or the attacker can already write files, as the user because of something other than Hardhat loading it. Hardhat made no trust decision, and it cannot undo an already-compromised account. The general fact of this access is not a Hardhat vulnerability.

The following preconditions already provide same-user code execution or file write access, regardless of how an issue describes them (for example, "plants," "edits," "poisons," or "pre-seeds"):

- an install-time script (`preinstall`, `postinstall`, or `prepare`) that the package manager runs for any dependency;
- a compromised editor, IDE extension, shell profile, or any other program the user runs;
- a pre-seeded Docker or CI base image;
- a poisoned CI cache restored into the job, because only a workflow already running code in that cache scope can write it;
- control of the user's environment variables, including `PATH`, `NODE_OPTIONS`, `HOME`, `XDG_CONFIG_HOME`, and `XDG_CACHE_HOME`; and
- same-user write access to files that no clone, pull request, or package install supplies, including Hardhat's global config, cache, and data directories (`~/.config/hardhat-nodejs`, `~/.cache/hardhat-nodejs`, and `~/.local/share/hardhat-nodejs` on Linux).

Classify a candidate at Baseline 4 only when evidence supports all three points:

1. **Weakest attacker:** identify a precondition from the list above and show why neither a network response nor data-only project content reaches the same code. A weaker-baseline path that requires another defect does not count; report that defect separately.
2. **No other-user path:** show that another local user cannot reach the issue through locations or permissions Hardhat creates. A directory the user chose to share with other users, containers, or machines counts as Baseline 4; the relevant precaution is to check its owner and warn the user.
3. **No surviving boundary is defeated:** show that the issue defeats none of the boundaries listed below.

#### Another local user is not Baseline 4

A different, less-privileged user on the same machine is closer to Baseline 1. Examples include a co-tenant on a shared CI runner or development machine, a container sidecar, or a low-privilege service account.

Predictable temporary paths, world-readable credential files, world-writable output directories, secrets exposed in process arguments, and symlink races in the artifacts or cache pipeline are genuine findings against this attacker.

## Forbidden outcomes for Baselines 1 and 2

Each outcome below is an escalation when reached from a network response or data alone, such as a `.sol` file, artifact, symlink, committed JSON file, or a dependency file that nothing is intended to execute:

- **Code execution:** run anything selected by the response or data.
- **Effects outside the project directory:** read, write, or change state in Hardhat's global directories, temporary directories, or another project's files.
- **Persistence:** continue affecting the user after the malicious project is deleted, or poison a later run of an unrelated project.
- **Secret disclosure:** reveal keystore contents, decrypted secrets, or configuration variables that the project was never granted.
- **Crossing into another trust domain:** cause a request, transaction, or submission to go somewhere the user did not intend.

Baselines 3 and 4 already have all these capabilities, so these outcomes never raise the rating at those baselines.

## Boundaries that survive same-user code execution

Defeating one of the following boundaries is the only escalation beyond same-user code execution, so it is a finding at every baseline. This list is exhaustive.

### Production-keystore confidentiality

The production keystore is encrypted at rest, and its password is never stored. A same-user attacker merely reading the encrypted file is not a finding. Another local user reading it is a finding because Hardhat has given that user an offline password-guessing target.

A **decrypted** secret escaping to an observable location—such as a log, error message, temporary file, environment variable, child-process argument, or network request—defeats this boundary and is a finding. A secret sent to the destination selected by resolved config is not an escape.

Judge observable egress, not time in memory. JavaScript strings cannot be reliably zeroed, so holding a secret in memory "too long" is not reportable on its own.

### Hardware-wallet confirmation on the device

The device displays what it will sign, and the user approves it there. Causing the device to sign something different from what it displayed defeats this boundary. Causing the host to send a different request, path, or account to the device does not: the host was never trusted, and device confirmation still applies.

### Explicit non-boundaries

The following are not boundaries against a same-user attacker, who can bypass them by editing `hardhat.config.ts`, exporting an environment variable, or patching `node_modules`. Another local user reaching one is still evaluated as described under [Another local user is not Baseline 4](#another-local-user-is-not-baseline-4).

- the development keystore, which intentionally unlocks from a plaintext password file;
- the integrity of configuration variables, the compiler cache, the compiler list, the Ledger derivation-path cache, or any other file in Hardhat's global directories or the project—download-time hash checks protect the Baseline 1 network path, not a same-user writer; and
- silence or stealth: "the user sees no prompt" is not a capability because a same-user attacker's edits are already silent.

## Already-compromised issues

An issue belongs here only when the attacker already runs code as the user, either through project config or plugins (Baseline 3) or outside Hardhat (Baseline 4), and no surviving boundary is defeated. It receives no severity.

Put each issue in one of these groups:

- **Precautions help:** Hardhat can still limit the damage, for example by encrypting secrets at rest or warning the user. Name the precaution.
- **Nothing to do:** nothing Hardhat can do would avoid the damage.

## Assets to protect

In rough priority order:

1. Private keys and secrets, especially the encrypted keystore and decrypted copies.
2. The user's machine and files: nothing should be read, written, or deleted outside the project beyond the user's intent.
3. Published outputs that leave the machine, such as build information uploaded to CI or source and metadata sent to block explorers by `hardhat verify`. These outputs can become exfiltration channels.
4. Build integrity.

## Severity definitions

- **High:** in a default setup, a Baseline 1 or 2 attacker reaches any [forbidden outcome](#forbidden-outcomes-for-baselines-1-and-2), or any attacker defeats a [surviving boundary](#boundaries-that-survive-same-user-code-execution).
- **Medium:** a High result that needs an unusual setup or extra access, such as one operating system, a specific plugin, a non-default setting, or another user on the same computer.
- **Low:** every other finding, such as a crash, a hang, or an effect whose content or destination the attacker cannot choose. A finding that requires the user's own mistake, such as a typo that makes Hardhat print a secret, is Low even when its result would otherwise be High or Medium.

## Finding requirements

A reported finding must:

1. identify the weakest attacker baseline that can trigger it;
2. name the new capability gained or the surviving boundary defeated;
3. describe a plausible attacker, the required precondition, and a concrete bad outcome; and
4. be a concrete, exploitable issue rather than a style concern.

"The attacker already runs code as the user" is a conclusion, not a starting assumption. Use it only after showing that the issue requires config control (Baseline 3) or proving all three Baseline 4 conditions. Most findings require only that a victim run Hardhat on untrusted input, which is normal use.

If a candidate does not meet the requirements above, it is not a finding. If it only works for an attacker who already runs code as the user, classify it under [Already-compromised issues](#already-compromised-issues) instead. Always check Baseline 3 and 4 candidates against the exhaustive list of surviving boundaries first.

## Examples

These examples illustrate the rules; they never override them.

### High

- Project files alone make a build read, write, or delete files outside the project.
- A network response makes Hardhat run a compiler whose checksum it never verified.
- Project files make Hardhat send a stored secret to a server the user did not choose.

### Medium

- A file shipped inside a dependency executes, but only on one operating system.
- Another person on the same computer can read Hardhat's secret files.
- A website the user visits can send requests to a running `hardhat node`.

### Low

- A typo in a stored secret makes Hardhat print it in an error message.
- A crafted Solidity file makes a build hang.
- A proxy exclusion setting is ignored, so a request uses the proxy anyway.

### Already compromised: precautions help

- Malware copies the production keystore file, but encryption makes the copy useless.
- A development-keystore value silently replaces the production value; a notice would warn the user.
- A cached compiler runs without another checksum check; rechecking would detect a swapped binary.
- The user shares their Hardhat folder with other users; checking its owner and warning the user limits planted files.

### Already compromised: nothing to do

- Malware sets environment variables, which override saved settings by design.
- A malicious plugin returns its own configuration-variable values through Hardhat hooks.
- Malware edits Hardhat's code in `node_modules`.
