---
name: analyze-peer-bump
description: Analyze the current branch for required peer dependency bumps. Use when completing a PR to update the `.peer-bumps.json` file.
---

## Background

When referring to packages we mean only internal packages in `./packages/*`. Exported code and types live under `./packages/<package>/src`, while non-exported internals live under `./packages/<package>/src/internal`.

An API change is a change to or removal of publicly exported functions, types, or interfaces reachable through the `exports` field in the package's `package.json`. The concern is whether the change could break the build or runtime behavior of existing consuming code.

When creating a PR with a changeset, the author should determine whether a peer dependency needs to be updated. There are two criteria:

1. Package A's API changed in this PR, package B peer-depends on A, and B uses the changed API. A release of A therefore implies a release of B.

2. A package now uses a new API (or a new part of an API) and so has to have its peer dependency updated to the minimum version of the depended-upon package where that API was introduced.

If either of these criteria are met, the author should include within the PR an update to the `.peer-bumps.json` file, adding a new bump entry with a reason to document the bump.

## `.peer-bumps.json` format

```json
{
  "$schema": "./scripts/peer-bumps.schema.json",
  "excludedFolders": [
    // ...
  ],
  "bumps": [
    {
      "package": "@nomicfoundation/hardhat-verify",
      "peer": "hardhat",
      "reason": "#7900 fixed some inconsistency issues in the SolidityBuildSystem API that will be shipped in the next version of Hardhat"
    }
  ]
}
```

Each entry of the `bumps` array has an optional `version` field:

- If omitted, the `package` should get `peer` bumped to the next version that is going to be released.
- If present, the `package` should get peer bumped to `workspace:^${version}`.

## Instructions

1. Read the `.peer-bumps.json` file to understand the current state.
2. Determine the base branch (use `gh pr view --json baseRefName -q .baseRefName` if in a PR context, otherwise fall back to `main`) and diff against it to identify all changed packages and their API changes.
3. For each changed package, identify other packages that depend on it as a peer dependency.
4. Determine if either bump criterion from the Background section is met.
5. If bumps are needed:
   - Update `.peer-bumps.json` with new entries at the end including a clear `reason` explaining why the bump is needed.
   - Verify that the branch's changesets include each `package` that requires a bump. A peer bump entry implies the package will be released, so it must have an associated changeset. Identify the branch's changesets by diffing `.changeset/` against the base branch. If a changeset is missing, inform the user.
6. If no bumps are needed, inform the user that they can add the `no peer bump needed` label to the PR.

Do not modify changesets or other code — only update `.peer-bumps.json`.

## Context

- The Release PR process runs `changeset version`, then reverts all peer dependency changes before using `.peer-bumps.json` to re-add the actual peer dependency bumps via `./scripts/peer-bumps.ts`.
- CI checks whether `.peer-bumps.json` has been modified or whether the `no peer bump needed` label has been added.
