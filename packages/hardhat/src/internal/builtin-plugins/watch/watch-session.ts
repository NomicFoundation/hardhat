import type { TestFileSelection } from "./test-file-selection.js";

/**
 * A file system change seen by the watcher.
 */
export interface FileChange {
  absolutePath: string;
  type: "add" | "change" | "unlink";
}

/**
 * How a command run ended.
 */
export interface CommandExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

/**
 * A running command started by the session.
 */
export interface CommandHandle {
  /**
   * Resolves when the command exits. It never rejects.
   */
  readonly exited: Promise<CommandExit>;

  kill(signal: NodeJS.Signals): void;
}

/**
 * What the session prints. Kept separate so that the session can be tested
 * without a terminal.
 */
export interface WatchOutput {
  /**
   * Called before each run, after the screen is cleared.
   *
   * @param changedFiles The files that triggered the run, empty for the first
   * run and for a manual rerun.
   * @param selectedTestFiles The test files the run is limited to, empty when
   * it runs everything.
   */
  runStarted(changedFiles: string[], selectedTestFiles: string[]): void;

  /**
   * Called when a run ends on its own, not when the session stopped it.
   */
  runFinished(exit: CommandExit, durationMs: number): void;

  clearScreen(): void;
}

export interface WatchSessionOptions {
  /**
   * The command line arguments of every run, without the watch arguments.
   */
  baseArguments: string[];

  /**
   * Starts the command with the given arguments.
   */
  spawn: (args: string[]) => CommandHandle;

  /**
   * When true, changes made while a run is in progress are ignored instead of
   * restarting it.
   */
  noRestart: boolean;

  /**
   * Selects the test files of each run (`hardhat test --watch`). Undefined for
   * commands that don't run tests.
   */
  testFileSelection?: TestFileSelection;

  /**
   * Returns whether the file is a test file, using the same rules as the
   * `test` task.
   */
  isTestFile: (absolutePath: string) => Promise<boolean>;

  output: WatchOutput;

  /**
   * How long to wait for a run to exit after asking it to stop, before
   * killing it.
   */
  stopTimeoutMs: number;

  now: () => number;

  /**
   * Called when a run starts and ends, so that the caller can give the
   * terminal input to the run while it is in progress.
   */
  onBusyChange?: (busy: boolean) => void;
}

interface RunningCommand {
  handle: CommandHandle;
  stoppedBySession: boolean;
}

/**
 * Runs a command, and runs it again each time the watched files change.
 *
 * Every run is a new process, so that each one loads the config, the plugins
 * and the sources from scratch, exactly like running the command by hand.
 */
export class WatchSession {
  readonly #options: WatchSessionOptions;
  #running: RunningCommand | undefined;
  #queue: Promise<void> = Promise.resolve();
  #stopped = false;

  constructor(options: WatchSessionOptions) {
    this.#options = options;
  }

  /**
   * Whether a run is in progress.
   */
  public get isBusy(): boolean {
    return this.#running !== undefined;
  }

  /**
   * Starts the first run.
   */
  public start(): Promise<void> {
    return this.#enqueue(async () => {
      await this.#startRun([], []);
    });
  }

  /**
   * Handles a batch of file changes: restarts the command, unless a run is in
   * progress and restarts are disabled.
   */
  public handleChanges(changes: FileChange[]): Promise<void> {
    return this.#enqueue(async () => {
      if (changes.length === 0) {
        return;
      }

      if (this.#running !== undefined && this.#options.noRestart) {
        return;
      }

      let selectedTestFiles: string[] = [];
      if (this.#options.testFileSelection !== undefined) {
        const changedTestFiles: string[] = [];
        const removedFiles: string[] = [];

        for (const change of changes) {
          if (change.type === "unlink") {
            removedFiles.push(change.absolutePath);
          } else if (await this.#options.isTestFile(change.absolutePath)) {
            changedTestFiles.push(change.absolutePath);
          }
        }

        selectedTestFiles = this.#options.testFileSelection.next(
          changedTestFiles,
          removedFiles,
        );
      }

      await this.#startRun(
        changes.map((change) => change.absolutePath),
        selectedTestFiles,
      );
    });
  }

  /**
   * Runs the whole command again, forgetting any test file selection.
   */
  public rerunAll(): Promise<void> {
    return this.#enqueue(async () => {
      this.#options.testFileSelection?.reset();
      await this.#startRun([], []);
    });
  }

  /**
   * Stops the session and the run in progress.
   *
   * @param force Kill the run immediately instead of asking it to stop first.
   */
  public async stop(force = false): Promise<void> {
    this.#stopped = true;

    if (force) {
      this.#running?.handle.kill("SIGKILL");
    }

    await this.#stopRunningCommand();
    await this.#queue;
  }

  #enqueue(job: () => Promise<void>): Promise<void> {
    this.#queue = this.#queue.then(async () => {
      if (this.#stopped) {
        return;
      }

      await job();
    });

    return this.#queue;
  }

  async #startRun(
    changedFiles: string[],
    selectedTestFiles: string[],
  ): Promise<void> {
    await this.#stopRunningCommand();

    if (this.#stopped) {
      return;
    }

    this.#options.output.clearScreen();
    this.#options.output.runStarted(changedFiles, selectedTestFiles);

    const startedAt = this.#options.now();
    const handle = this.#options.spawn([
      ...this.#options.baseArguments,
      ...selectedTestFiles,
    ]);

    const running: RunningCommand = { handle, stoppedBySession: false };
    this.#running = running;
    this.#options.onBusyChange?.(true);

    void handle.exited.then((exit) => {
      if (this.#running === running) {
        this.#running = undefined;
        this.#options.onBusyChange?.(false);
      }

      if (!running.stoppedBySession) {
        this.#options.output.runFinished(exit, this.#options.now() - startedAt);
      }
    });
  }

  async #stopRunningCommand(): Promise<void> {
    const running = this.#running;
    if (running === undefined) {
      return;
    }

    running.stoppedBySession = true;
    running.handle.kill("SIGTERM");

    let timeout: NodeJS.Timeout | undefined;
    const timedOut = new Promise<"timeout">((resolve) => {
      timeout = setTimeout(
        () => resolve("timeout"),
        this.#options.stopTimeoutMs,
      );
    });

    const outcome = await Promise.race([running.handle.exited, timedOut]);
    clearTimeout(timeout);

    if (outcome === "timeout") {
      running.handle.kill("SIGKILL");
      await running.handle.exited;
    }

    if (this.#running === running) {
      this.#running = undefined;
      this.#options.onBusyChange?.(false);
    }
  }
}
