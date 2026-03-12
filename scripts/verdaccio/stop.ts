import { existsSync, readFileSync, rmSync } from "node:fs";
import { fmt, log, logStep } from "./helpers/logging.ts";
import { VERDACCIO_PID_FILE } from "./helpers/shell.ts";

export function stop(): void {
  logStep("Stopping Verdaccio");

  if (!existsSync(VERDACCIO_PID_FILE)) {
    log(fmt.deemphasize("No PID file found, nothing to stop"));

    return;
  }

  const pid = parseInt(readFileSync(VERDACCIO_PID_FILE, "utf-8").trim(), 10);

  if (isNaN(pid)) {
    log(fmt.deemphasize("Invalid PID file, removing"));

    rmSync(VERDACCIO_PID_FILE);

    return;
  }

  try {
    process.kill(pid, "SIGTERM");

    log(`Stopped Verdaccio ${fmt.deemphasize(`(PID ${pid})`)}`);
  } catch {
    log(fmt.deemphasize("Process not running (stale PID file)"));
  }

  rmSync(VERDACCIO_PID_FILE);

  log(fmt.success("Done"));
}
