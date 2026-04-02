import type { ISpinner } from "../src/spinner.js";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { createSpinner, FRAME_INTERVAL_MS } from "../src/spinner.js";

interface CapturedStream {
  stream: NodeJS.WriteStream;
  writes: string[];
  clearCount: number;
  cursorCount: number;
}

function createCapturedStream(): CapturedStream {
  const writes: string[] = [];
  let clearCount = 0;
  let cursorCount = 0;

  /* eslint-disable @typescript-eslint/consistent-type-assertions -- create a minimal WriteStream mock
  for tests */
  const stream = {
    isTTY: true,
    columns: 80,
    write(
      chunk: string | Uint8Array,
      encodingOrCallback?: unknown,
      callback?: unknown,
    ): boolean {
      const text =
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
      writes.push(text);

      if (typeof encodingOrCallback === "function") {
        encodingOrCallback();
      } else if (typeof callback === "function") {
        callback();
      }

      return true;
    },
    clearLine(_dir: number, callback?: () => void): boolean {
      clearCount += 1;
      callback?.();
      return true;
    },
    cursorTo(
      _x: number,
      yOrCallback?: number | (() => void),
      callback?: () => void,
    ): boolean {
      cursorCount += 1;
      if (typeof yOrCallback === "function") {
        yOrCallback();
      } else {
        callback?.();
      }
      return true;
    },
  } as NodeJS.WriteStream;

  return {
    stream,
    writes,
    get clearCount() {
      return clearCount;
    },
    set clearCount(value: number) {
      clearCount = value;
    },
    get cursorCount() {
      return cursorCount;
    },
    set cursorCount(value: number) {
      cursorCount = value;
    },
  };
}

describe("spinner", { concurrency: false }, () => {
  let captured: CapturedStream;
  let spinner: ISpinner;

  function resetCapturedState(): void {
    captured.writes.length = 0;
    captured.clearCount = 0;
    captured.cursorCount = 0;
  }

  beforeEach(() => {
    mock.timers.enable({ apis: ["setInterval"] });
    captured = createCapturedStream();
    spinner = createSpinner({ stream: captured.stream, text: "initial" });
  });

  afterEach(() => {
    spinner.stop();
    mock.timers.reset();
  });

  describe("start", () => {
    it("should render first frame", async () => {
      spinner.start();

      mock.timers.tick(FRAME_INTERVAL_MS + 1);
      assert.ok(
        captured.writes[0]?.startsWith("⠋ initial"),
        `expected first write to start with spinner frame, got: ${captured.writes[0]}`,
      );

      assert.equal(captured.clearCount, 1);
      assert.equal(captured.cursorCount, 1);
    });
  });

  describe("stop", () => {
    it("stop clears current line", () => {
      spinner.start();
      resetCapturedState();
      spinner.stop();

      assert.equal(captured.writes.length, 0);
      assert.equal(captured.clearCount, 1);
      assert.equal(captured.cursorCount, 1);
    });
  });

  describe("disabled spinner behavior", () => {
    it("disabled spinner does nothing on start", () => {
      const disabled = createSpinner({
        stream: captured.stream,
        text: "disabled",
        enabled: false,
      });

      disabled.start();

      assert.equal(captured.writes.length, 0);
      assert.equal(captured.clearCount, 0);
      assert.equal(captured.cursorCount, 0);
    });
  });
});
