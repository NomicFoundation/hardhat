# Acceptance scenarios

Each directory here is one acceptance scenario, holding a `scenario.md`.

A scenario is documentation first: the prose describes a piece of the command line's behaviour, for a reader who wants to know what Hardhat does. The code block in it is the test. It is run as a script in an empty directory whose only other content is the registry configuration pointing at a local Verdaccio, and the scenario passes if the script runs to completion and exits 0.

The script runs under `set -eo pipefail`. It stops at the first command that fails, and a pipeline fails if any command in it fails, not only the last, so `npx hardhat test | tee test.log` fails when the tests do. Avoid pipelines whose reader stops early, such as `| head`, `| grep -q` or `yes |`: the writer can be killed by `SIGPIPE`, which fails the scenario intermittently. Note too that `-e` does not stop on a failure inside an `if` condition or on the left of `&&` or `||`.

## Package managers

A scenario can run once for each package manager a user might invoke Hardhat with. Its frontmatter lists them, and its script uses placeholders where the command differs:

````markdown
---
packageManager: [npm, pnpm, bun]
---

# Initializing the minimal template

…

```sh
{{runRemote}} hardhat --init --template minimal
{{run}} hardhat compile
```
````

Each package manager is one run, reported as `minimal [pnpm]`, in a directory of its own. Before a run the placeholders are replaced, so what runs, and what the output shows, is what a user of that package manager would type:

| `packageManager` | `{{runRemote}}` | `{{run}}` | `{{packageManager}}` |
| ---------------- | --------------- | --------- | -------------------- |
| `npm`            | `npx`           | `npx`     | `npm`                |
| `pnpm`           | `pnpm dlx`      | `pnpm`    | `pnpm`               |
| `bun`            | `bunx`          | `bunx`    | `bun`                |

`{{runRemote}}` is the command for when there is no project yet, and `{{run}}` the one inside a project, as in the per-package-manager tabs of the Hardhat documentation. `--init` installs the project's dependencies with whichever package manager launched it.

Yarn is not supported yet: `yarn dlx hardhat --init` does not work in an empty directory, and Hardhat does not run under Yarn Plug'n'Play.

A scenario is templated or literal, never half: placeholders need a `packageManager` to fill them, and `pnpm acceptance validate` rejects one without the other, an unknown placeholder, and an unsupported package manager. Placeholders are replaced in the code block only, never in the prose.

## Running

Output is captured, not streamed. When a run passes, the commands it ran are printed, expanded and prefixed with `$`. When it fails, its whole output is printed, with each command at the point it ran, followed by the path of the script, which is the expanded one and can be run by hand from the run's directory.

Run them with:

```sh
pnpm acceptance validate   # check the scenarios without running them
pnpm acceptance run        # run them all
pnpm acceptance run --scenario minimal
```

See `scripts/acceptance/main.ts` for the full usage.
