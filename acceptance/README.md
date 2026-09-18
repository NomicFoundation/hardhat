# Acceptance scenarios

Each directory here is one acceptance scenario, holding a `scenario.md`.

A scenario is documentation first: the prose describes a piece of the command line's behaviour, for a reader who wants to know what Hardhat does. The code block in it is the test. It is run as a script in an empty directory whose only other content is an `.npmrc` pointing at a local Verdaccio registry, and the scenario passes if the script runs to completion and exits 0.

Run them with:

```sh
pnpm acceptance validate   # check the scenarios without running them
pnpm acceptance run        # run them all
pnpm acceptance run --scenario minimal
```

See `scripts/acceptance/main.ts` for the full usage.
