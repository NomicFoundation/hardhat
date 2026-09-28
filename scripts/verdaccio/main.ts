import { start } from "./start.ts";
import { publish, sinceReleasePublish } from "./publish.ts";
import { stop } from "./stop.ts";
import { logError } from "./helpers/logging.ts";

const USAGE = `
scripts/verdaccio/main.ts — Manage a local Verdaccio registry for testing

DESCRIPTION
  Manages a local Verdaccio npm registry. Use \`start\` to start the server,
  \`publish\` to build and publish all packages, and \`stop\` to stop it.

  The start flow:
    1. Kills any existing instance
    2. Generates config, writes auth files
    3. Starts a Verdaccio server on 127.0.0.1:4873 (foreground by default)
    4. Waits for the server to be ready

  The publish flow:
    1. Builds and publishes all packages to the running Verdaccio instance
    2. Reports what was published

  Packages are published if their version differs from what is already in
  the full npm registry. Use --changes to re-publish packages in verdaccio
  with local edits (Note: only works for packages with versions higher than
  npm).

  --since-release lifts that restriction. It publishes each package a minor
  above npm's latest, so the local build outranks what the uplink serves and
  stays ahead of a release landing during the run. A release already above
  npm is published as it stands, while a prerelease is rounded up to the
  next patch.

  The raised version is written into each package.json and left there.
  Restore them with: git checkout -- packages/*/package.json. Because the
  raise has to know what npm released, it needs network access to
  registry.npmjs.org and fails without it.

  The registry stays alive after start completes, so external repos can
  install packages from http://127.0.0.1:4873.

COMMANDS
  start                Start the Verdaccio server
  publish              Build and publish packages to Verdaccio
  stop                 Stop the running Verdaccio instance
  (none)               Print this usage information

OPTIONS
  --background         Run Verdaccio in the background (use with start)
  --no-git-checks      Skip the clean working tree check (use with publish)
  --changes            Re-publish only packages with uncommitted changes (use with publish)
                       Implies --no-git-checks
  --since-release      Detect packages changed since their last release, raise their
                       minor version above npm's latest, and publish (use with
                       publish). Requires network access to registry.npmjs.org.

EXAMPLES
  pnpm verdaccio start
  pnpm verdaccio publish
  pnpm verdaccio publish --changes
  pnpm verdaccio publish --since-release
  pnpm verdaccio stop

  # Typical workflow
  pnpm verdaccio start                     # foreground
  pnpm verdaccio start --background        # background
  pnpm verdaccio publish
  # ... make changes, rebuild ...
  pnpm verdaccio publish --no-git-checks --changes

RUNTIME DIRECTORY
  All state is stored in .verdaccio/ at the project root (gitignored):
    config.yaml     Generated verdaccio configuration
    storage/        Published package tarballs
    htpasswd        User authentication file
    .npmrc          Auth token for pnpm publish
    server.log      Server output log
    verdaccio.pid   PID of the running process
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const noGitChecks = args.includes("--no-git-checks");
  const background = args.includes("--background");
  const changes = args.includes("--changes");
  const sinceRelease = args.includes("--since-release");

  try {
    if (command === "start") {
      await start(background);
    } else if (command === "publish") {
      if (sinceRelease) {
        await sinceReleasePublish();
      } else {
        publish(changes, noGitChecks);
      }
    } else if (command === "stop") {
      stop();
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
