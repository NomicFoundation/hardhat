# Acceptance scenarios

Each directory here is one acceptance scenario, holding a `scenario.md`.

A scenario is documentation first: the prose describes a piece of the command line's behaviour, for a reader who wants to know what Hardhat does. The code block in it is the test. It is run as a script in an empty directory whose only other content is an `.npmrc` pointing at a local Verdaccio registry, and the scenario passes if the script runs to completion and exits 0.

The script runs under `set -eo pipefail`. It stops at the first command that fails, and a pipeline fails if any command in it fails, not only the last, so `npx hardhat test | tee test.log` fails when the tests do. Avoid pipelines whose reader stops early, such as `| head`, `| grep -q` or `yes |`: the writer can be killed by `SIGPIPE`, which fails the scenario intermittently. Note too that `-e` does not stop on a failure inside an `if` condition or on the left of `&&` or `||`.

Run them with:

```sh
pnpm acceptance validate   # check the scenarios without running them
pnpm acceptance run        # run them all
pnpm acceptance run --scenario minimal
```

See `scripts/acceptance/main.ts` for the full usage.
