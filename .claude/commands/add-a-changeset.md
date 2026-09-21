---
name: add-a-changeset
description: Write the changeset for the current branch. Use when completing a PR.
---

## Background

A changeset is a markdown file in `.changeset/` recording a change so it can be released. Its YAML frontmatter maps npm package names to a bump level; its body is the changelog entry.

```markdown
---
"hardhat": patch
---

Fixed the `hardhat node` task so the `--chain-id` option is applied to the network again.
```

**A changeset is what triggers a release.** Nothing ships without one, so a README fix we want users to receive still needs a changeset.

`changeset version` copies the body verbatim into the `CHANGELOG.md` of every package named in the frontmatter. Each published package then gets its own GitHub Release whose body is that changelog section, with `### Major/Minor/Patch Changes` flattened to a single `### Changes`. The bump level is therefore invisible to readers, and the body is read as one line in a long list on the GitHub Release feed. Write for the reader of the GitHub Release feed.

## Which packages to name

Name every package that has to be released for the change to reach users, by its npm name (`hardhat`, `@nomicfoundation/hardhat-utils`) rather than its directory name. A package marked `private: true` in its `package.json` is never published and so never needs naming, and neither does anything in the `ignore` array of `.changeset/config.json` — check those two rather than trusting a list. At the time of writing they are `@nomicfoundation/config`, `@nomicfoundation/example-project`, `@nomicfoundation/template-package`, `template-*` and `@nomicfoundation/hardhat-test-utils`.

**One changeset per user-visible change**, naming every package that must be released for the change. One behaviour that spans packages gets one changeset naming them all.

**The same edit applied independently to several packages is several changes, not one.** Upgrading a dependency in two plugins is two changesets even though the sentence is identical, because either plugin could ship without the other. The test is whether you would release one without the other; if you would, they are independent. Split too when the packages need different sentences, or when the branch does more than one user-visible thing. Do not split merely because several packages are involved.

**Give each package the bump level its own change deserves**, not the level of the headline package. The frontmatter is a per-package map, so `"hardhat": minor` can sit next to `"@nomicfoundation/hardhat-errors": patch`. This matters beyond the version number: `updateInternalDependencies` is `minor`, so a package bumped `minor` has its dependency range rewritten in every package released alongside it, while `patch` leaves those ranges untouched. A `minor` that a low-level package like `@nomicfoundation/hardhat-utils` did not earn churns ranges across the whole release.

## Bump level

- **`patch`** — the default. Bug fixes, performance improvements, and anything else that has to ship.
- **`minor`** — adds something user facing.
- **`major`** — never write one without asking first. See below.

**`major` is never correct for the `hardhat` package.**

**`major` in a plugin needs human sign-off.** Do not write the changeset. Tell the user why you believe major is right, and wait. Write it only if they agree.

**A breaking change in `hardhat` also stops.** Do not write the changeset. Flag the break, explain it, and remind the user that Hardhat does not bump major outside a major upgrade project. Ask them to confirm `minor` is right. When they do, write a `minor` changeset whose line says the change is breaking, and prompt to think through how the break should be communicated to Hardhat's users.

## Style

The entry is read as one line among many on the GitHub Release feed. Keep it scannable.

- **One sentence.** Two at the very most. **Never more than one paragraph** — a changeset with a paragraph break is either several changesets, or one changeset carrying context that belongs in the docs.
- **Around 120 characters.** Past 200 you are explaining rather than announcing.
- **Past tense, leading with the verb**: `Fixed`, `Added`, `Updated`, `Improved`, `Removed`, `Deprecated`. Never "This PR adds…".
- **Always end with a full stop.** When the line ends with a link, the full stop goes after its closing bracket.
- **Do not write the pull request link or the thanks.** `@changesets/changelog-github` prepends both to every entry:

  ```text
  - [#PR](…) [`sha`](…) Thanks [@user](…)! -
  ```

  A hand-written link is justified only when it points at an **issue**, since the generated one already points at the pull request.

- **Backtick** every identifier, config key, package name, CLI flag, error code and literal value: `hre.network.create()`, `test.solidity.ffi`, `--coverage`, `HHE27`.
- Name the **user-visible symptom**, not the internal cause.

Too long — a real entry, 449 characters over two paragraphs:

```text
Hardhat now warns when a plugin is imported in `hardhat.config.ts` but missing from the `plugins` array. The warning is printed to stderr after the runtime environment is created, listing the offending plugins and pointing the user at the fix.

For the warning to be reliable, your project's `tsconfig.json` must enable `verbatimModuleSyntax: true`. Without it, TypeScript deletes unused default-value imports, so an unused plugin can't be detected.
```

Fixed, at 105:

```text
Added a warning when a plugin is imported in `hardhat.config.ts` but is missing from the `plugins` array.
```

_Where_ the warning prints is detail the reader cannot act on. The `verbatimModuleSyntax` caveat does matter, which is why it belongs in the docs behind a `# docs:` link rather than in a line competing for attention.

## Filename

Name the file after the change in kebab-case, so a human scanning `.changeset/` or the release pull request can tell the entries apart: `warn-unused-plugins.md`, `update-crypto-deps.md`. The branch name is usually a good starting point. Do not use the random `fluffy-papayas-reflect.md` name that `changeset add` generates.

## Docs links

CI fails the pull request if its body contains a hardhat-website pull request link that is not also in a changeset frontmatter. Mirror each one as a comment above the packages:

```markdown
---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/292
"hardhat": minor
---
```

Only `https://github.com/NomicFoundation/hardhat-website/pull/<number>` is recognised; anything else is ignored silently and the check still fails. A hardhat-website **issue** link satisfies the check from the pull request body alone and does not belong in the frontmatter.

## When no changeset is needed

"No changeset needed" is a legitimate answer — refactors, test-only changes and CI work that users will never see. Explain why, and remind the user to add the `no changeset needed` label so the check passes. Never invent an entry to satisfy CI.

## Instructions

1. Determine the base branch (`gh pr view --json baseRefName -q .baseRefName`, otherwise `main`) and diff against it.
2. Read the branch name and, if there is a pull request, its title and body. They are the best indication of what the change is for.
3. Work out what the user-visible change is and which packages have to be released for it. Check `.changeset/` for an entry already added on this branch before writing another.
4. If nothing user-visible changed, stop and tell the user to add the `no changeset needed` label.
5. Decide the bump level. If it is `major`, or a breaking change in `hardhat`, stop and ask as described above.
6. If the pull request body links a hardhat-website pull request, add a `# docs:` line for each.
7. Write the file to `.changeset/<descriptive-name>.md`.
8. Report which packages are named and why, and remind the user to run `/analyze-peer-bump` — it checks that every package needing a peer bump has a changeset.

Do not modify `.peer-bumps.json`, source code, or changesets other than the ones you add.

## Context

- Three checks run on every pull request, each with its own escape label: `no changeset needed`, `no peer bump needed`, `no docs needed`. Release pull requests (head ref starting `changeset-release/`) are exempt from all three.
- `.changeset/config.json` points the changelog generator at `scripts/custom-changelog.ts`, which uses `@changesets/changelog-github` whenever `GITHUB_TOKEN` is set.
