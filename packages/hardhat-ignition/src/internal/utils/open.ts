import { spawnSync } from "node:child_process";
import os from "node:os";

export interface OpenCommand {
  file: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
}

/**
 * Opens a file with the platform's default application (i.e. the visualization
 * report in the user's browser).
 */
export function open(filePath: string): void {
  const { file, args, windowsVerbatimArguments } = getOpenCommand(
    os.platform(),
    filePath,
  );

  try {
    spawnSync(file, args, { stdio: "ignore", windowsVerbatimArguments });
  } catch {
    // do nothing
  }
}

/**
 * Builds the command that opens a file with the platform's default
 * application.
 *
 * On macOS and Linux the path is passed as a single argument, without a
 * shell, so it is never split or interpreted, whatever characters it contains.
 *
 * On Windows `start` is a `cmd` builtin, so `cmd` has to parse the command
 * line. The path is quoted explicitly and passed verbatim, because Node only
 * quotes arguments that contain whitespace, which would leave characters like
 * `&` exposed to `cmd`. Windows paths cannot contain `"`, so the quoting cannot
 * be broken out of.
 */
export function getOpenCommand(
  platform: NodeJS.Platform,
  filePath: string,
): OpenCommand {
  switch (platform) {
    case "win32":
      return {
        file: "cmd",
        // `start` treats its first quoted argument as the window title, so an
        // empty title goes before the path
        args: ["/d", "/s", "/c", `"start "" "${filePath}""`],
        windowsVerbatimArguments: true,
      };
    case "darwin":
      return { file: "open", args: [filePath] };
    default:
      return { file: "xdg-open", args: [filePath] };
  }
}
