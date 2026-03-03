import { start } from "./start.ts";
import { publish } from "./publish.ts";
import { stop } from "./stop.ts";
import { logError } from "./helpers/logging.ts";

const USAGE = `
verdaccio/install — Manage a local Verdaccio registry for testing

DESCRIPTION
  Manages a local Verdaccio npm registry. Use --start to start the server,
  --publish to build and publish all packages, and --stop to stop it.

  The --start flow:
    1. Kills any existing instance
    2. Generates config, writes auth files
    3. Starts a Verdaccio server on 127.0.0.1:4873 (foreground by default)
    4. Waits for the server to be ready

  The --publish flow:
    1. Builds and publishes all packages to the running Verdaccio instance
    2. Reports what was published

  Packages are published if their version differs from what is already in
  the registry. Use --changes to re-publish packages in verdaccio with local
  edits.

  The registry stays alive after --start completes, so external repos can
  install packages from http://localhost:4873.

COMMANDS
  --start              Start the Verdaccio server
  --publish            Build and publish packages to Verdaccio
  --stop               Stop the running Verdaccio instance
  (none)               Print this usage information

OPTIONS
  --background         Run Verdaccio in the background (use with --start)
  --no-git-checks      Skip the clean working tree check (use with --publish)
  --changes            Re-publish only packages with uncommitted changes (use with --publish)
                       Implies --no-git-checks

EXAMPLES
  node scripts/verdaccio/install.ts --start
  node scripts/verdaccio/install.ts --publish
  node scripts/verdaccio/install.ts --publish --changes
  node scripts/verdaccio/install.ts --stop

  # Typical workflow
  node scripts/verdaccio/install.ts --start                   # foreground
  node scripts/verdaccio/install.ts --start --background      # background
  node scripts/verdaccio/install.ts --publish
  # ... make changes, rebuild ...
  node scripts/verdaccio/install.ts --publish --changes

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

  try {
    if (command === "--start") {
      await start(background);
    } else if (command === "--publish") {
      publish(changes, noGitChecks);
    } else if (command === "--stop") {
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
