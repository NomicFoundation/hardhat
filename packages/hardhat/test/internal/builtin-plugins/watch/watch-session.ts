import type {
  CommandExit,
  CommandHandle,
  FileChange,
  WatchOutput,
} from "../../../../src/internal/builtin-plugins/watch/watch-session.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TestFileSelection } from "../../../../src/internal/builtin-plugins/watch/test-file-selection.js";
import { WatchSession } from "../../../../src/internal/builtin-plugins/watch/watch-session.js";

/**
 * A command that runs until the test makes it exit, or until it is killed.
 */
class FakeCommand implements CommandHandle {
  public readonly exited: Promise<CommandExit>;
  public readonly signals: NodeJS.Signals[] = [];
  readonly #ignoreSigterm: boolean;
  #resolve: (exit: CommandExit) => void = () => {};

  constructor(
    public readonly args: string[],
    ignoreSigterm: boolean,
  ) {
    this.#ignoreSigterm = ignoreSigterm;
    this.exited = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  public kill(signal: NodeJS.Signals): void {
    this.signals.push(signal);

    if (signal === "SIGTERM" && this.#ignoreSigterm) {
      return;
    }

    this.#resolve({ code: null, signal });
  }

  public finish(code: number): void {
    this.#resolve({ code, signal: null });
  }
}

class RecordingOutput implements WatchOutput {
  public readonly started: Array<{ changed: string[]; selected: string[] }> =
    [];
  public readonly finished: CommandExit[] = [];
  public clears = 0;

  public runStarted(changedFiles: string[], selectedTestFiles: string[]): void {
    this.started.push({ changed: changedFiles, selected: selectedTestFiles });
  }

  public runFinished(exit: CommandExit): void {
    this.finished.push(exit);
  }

  public clearScreen(): void {
    this.clears++;
  }
}

function createSession({
  noRestart = false,
  testFiles,
  ignoreSigterm = false,
  stopTimeoutMs = 1000,
}: {
  noRestart?: boolean;
  testFiles?: string[];
  ignoreSigterm?: boolean;
  stopTimeoutMs?: number;
} = {}) {
  const commands: FakeCommand[] = [];
  const output = new RecordingOutput();
  const busy: boolean[] = [];

  const session = new WatchSession({
    baseArguments: ["test"],
    spawn: (args) => {
      const command = new FakeCommand(args, ignoreSigterm);
      commands.push(command);
      return command;
    },
    noRestart,
    testFileSelection:
      testFiles !== undefined ? new TestFileSelection(true) : undefined,
    isTestFile: async (file) => testFiles?.includes(file) ?? false,
    output,
    stopTimeoutMs,
    now: () => 0,
    onBusyChange: (value) => busy.push(value),
  });

  return { session, commands, output, busy };
}

function change(
  absolutePath: string,
  type: FileChange["type"] = "change",
): FileChange {
  return { absolutePath, type };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("watch/WatchSession", () => {
  it("runs the command with the base arguments on start", async () => {
    const { session, commands, output } = createSession();

    await session.start();

    assert.equal(commands.length, 1);
    assert.deepEqual(commands[0].args, ["test"]);
    assert.equal(output.clears, 1);
    assert.deepEqual(output.started, [{ changed: [], selected: [] }]);
  });

  it("reports a run that ends on its own, and becomes idle", async () => {
    const { session, commands, output, busy } = createSession();

    await session.start();
    commands[0].finish(1);
    await settle();

    assert.deepEqual(output.finished, [{ code: 1, signal: null }]);
    assert.equal(session.isBusy, false);
    assert.deepEqual(busy, [true, false]);
  });

  it("runs again when files change after a run ended", async () => {
    const { session, commands, output } = createSession();

    await session.start();
    commands[0].finish(0);
    await settle();

    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.equal(commands.length, 2);
    assert.deepEqual(output.started[1], {
      changed: ["/p/contracts/A.sol"],
      selected: [],
    });
  });

  it("restarts a run in progress when files change", async () => {
    const { session, commands, output } = createSession();

    await session.start();
    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.deepEqual(commands[0].signals, ["SIGTERM"]);
    assert.equal(commands.length, 2);
    // The stopped run is not reported, as it didn't end on its own
    assert.deepEqual(output.finished, []);
  });

  it("kills a run that doesn't stop after the timeout", async () => {
    const { session, commands } = createSession({
      ignoreSigterm: true,
      stopTimeoutMs: 10,
    });

    await session.start();
    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.deepEqual(commands[0].signals, ["SIGTERM", "SIGKILL"]);
    assert.equal(commands.length, 2);
  });

  it("ignores changes during a run with noRestart", async () => {
    const { session, commands } = createSession({ noRestart: true });

    await session.start();
    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.equal(commands.length, 1);
    assert.deepEqual(commands[0].signals, []);
  });

  it("runs only the changed test file, then reuses it for other changes", async () => {
    const testFile = "/p/test/A.t.sol";
    const { session, commands } = createSession({ testFiles: [testFile] });

    await session.start();
    await session.handleChanges([change(testFile)]);
    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.deepEqual(commands[1].args, ["test", testFile]);
    assert.deepEqual(commands[2].args, ["test", testFile]);
  });

  it("doesn't select a removed test file", async () => {
    const testFile = "/p/test/A.t.sol";
    const { session, commands } = createSession({ testFiles: [testFile] });

    await session.start();
    await session.handleChanges([change(testFile)]);
    await session.handleChanges([change(testFile, "unlink")]);

    assert.deepEqual(commands[2].args, ["test"]);
  });

  it("reruns everything on rerunAll, forgetting the selection", async () => {
    const testFile = "/p/test/A.t.sol";
    const { session, commands } = createSession({ testFiles: [testFile] });

    await session.start();
    await session.handleChanges([change(testFile)]);
    await session.rerunAll();
    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.deepEqual(commands[2].args, ["test"]);
    assert.deepEqual(commands[3].args, ["test"]);
  });

  it("stops the run in progress and ignores later changes after stop", async () => {
    const { session, commands } = createSession();

    await session.start();
    await session.stop();
    await session.handleChanges([change("/p/contracts/A.sol")]);

    assert.deepEqual(commands[0].signals, ["SIGTERM"]);
    assert.equal(commands.length, 1);
    assert.equal(session.isBusy, false);
  });

  it("kills the run immediately on a forced stop", async () => {
    const { session, commands } = createSession({ ignoreSigterm: true });

    await session.start();
    await session.stop(true);

    assert.equal(commands[0].signals[0], "SIGKILL");
  });
});
