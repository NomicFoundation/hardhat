#!/usr/bin/env node
import { resolveAndValidateArgs } from "./helpers/args.ts";
import { logError } from "./helpers/log.ts";
import { run } from "./subcommands/run.ts";
import { validate } from "./subcommands/validate.ts";

const USAGE = `
./scripts/acceptance/main.ts — Run Hardhat's acceptance scenarios

DESCRIPTION
  Each scenario is a markdown file, acceptance/<slug>/scenario.md, whose prose
  documents a piece of the CLI's UI/UX and whose code block is the test. The
  block is a script: it runs to completion and exits 0, or the scenario fails
  and its output is printed.

  A scenario runs in an empty directory holding an .npmrc pointing at a local
  Verdaccio registry, which serves the packages built from this working tree.

COMMANDS
  run                          Run the scenarios
  validate                     Check the scenarios without running them
  (none)                       Print this usage information

OPTIONS
  --scenario <slug>            Only this scenario (default: all)
  --acceptance-dir <path>      Where scenarios run
                               (default: $ACCEPTANCE_DIR or "/tmp/acceptance")
  --no-git-checks              Publish even with uncommitted changes (use with run).
                               The scenarios then test the working tree rather
                               than the committed code.
  --force-publish-all          Start Verdaccio serving the packages built here and
                               nothing else, and publish all of them whatever
                               their version (use with run). Implies
                               --no-git-checks. For local development: edit a
                               package, run, without bumping a version or
                               committing. CI runs without it, on a release
                               branch, where the real bumped versions publish.

VERDACCIO
  If Verdaccio is already running it is used as-is, and nothing is published.
  Otherwise it is started, the packages are published to it, and it is stopped
  again once the run completes.

  Publishing only publishes a package whose version differs from the one on
  npm, so it is a no-op on a branch level with the last release. The run fails
  rather than quietly testing the released Hardhat.

EXAMPLES
  pnpm acceptance validate
  pnpm acceptance run
  pnpm acceptance run --scenario minimal
  pnpm acceptance run --no-git-checks
  pnpm acceptance run --force-publish-all
  ACCEPTANCE_DIR=/tmp/scratch pnpm acceptance run
`;

async function main(): Promise<void> {
  const {
    runFlag,
    validateFlag,
    acceptanceDirectory,
    scenario,
    noGitChecks,
    forcePublishAll,
  } = resolveAndValidateArgs(process.argv.slice(2));

  try {
    if (runFlag) {
      await run(acceptanceDirectory, scenario, noGitChecks, forcePublishAll);
    } else if (validateFlag) {
      validate(scenario);
    } else {
      console.log(USAGE);
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    logError(error.message);
    process.exit(1);
  }
}

await main();
