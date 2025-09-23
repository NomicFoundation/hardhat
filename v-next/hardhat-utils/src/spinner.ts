const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;

export interface ISpinner {
  readonly isEnabled: boolean;
  readonly isSpinning: boolean;
  runWithPause(action: () => void): void;
  start(text?: string): void;
  update(text: string): void;
  stop(text?: string): void;
  stopAndPersist(text: string, symbol?: string): void;
  succeed(text?: string, symbol?: string): void;
  fail(text?: string, symbol?: string): void;
}

/**
 * Spinner that writes frames to a stream.
 *
 * Falls back to console logs when output is disabled.
 */
class Spinner implements ISpinner {
  public readonly isEnabled: boolean;

  #text: string;
  #frameIndex = 0;

  #interval: NodeJS.Timeout | undefined;
  #isSpinning = false;
  #loggedFallback = false;
  readonly #stream: NodeJS.WriteStream;

  constructor(
    stream: NodeJS.WriteStream,
    enabled: boolean,
    initialText: string,
  ) {
    this.isEnabled = enabled;
    this.#stream = stream;

    this.#text = initialText;
  }

  public get isSpinning(): boolean {
    return this.#isSpinning;
  }

  public runWithPause(action: () => void): void {
    if (!this.isEnabled || !this.isSpinning) {
      action();
      return;
    }

    this.stop();
    action();
    if (!this.#isSpinning) {
      this.start(this.#text);
    }
  }

  /**
   * Begin rendering frames or log the first message when disabled.
   *
   * @param nextText Optional text to show while running.
   */
  public start(nextText?: string): void {
    if (nextText !== undefined) {
      this.#text = nextText;
    }

    if (!this.isEnabled) {
      if (this.#text !== "" && !this.#loggedFallback) {
        console.log(this.#text);
        this.#loggedFallback = true;
      }
      return;
    }

    this.#stopInternal();
    this.#isSpinning = true;
    this.#render(false);
    this.#interval = setInterval(() => this.#render(true), FRAME_INTERVAL_MS);
  }

  /**
   * Replace the current message while the spinner is running.
   *
   * @param nextText New message to display.
   */
  public update(nextText: string): void {
    this.#text = nextText;

    if (this.isEnabled && this.#isSpinning) {
      this.#render(false);
    } else if (!this.isEnabled && this.#loggedFallback) {
      console.log(nextText);
    }
  }

  /**
   * Stop the spinner without printing a final line.
   */
  public stop(nextText?: string): void {
    if (nextText !== undefined) {
      this.#text = nextText;
    }

    this.#stopInternal();
  }

  /**
   * Stop the spinner and leave the last line in the terminal.
   *
   * @param text Text to print on the final line.
   * @param symbol Optional prefix placed before the text.
   */
  public stopAndPersist(text: string, symbol?: string): void {
    this.#text = text;
    this.#finalize(text, symbol);
  }

  /**
   * Finish the spinner with a success message.
   *
   * @param text Optional message to show instead of the stored text.
   * @param symbol Optional prefix placed before the text. Defaults to "✔".
   */
  public succeed(text?: string, symbol: string = "✔"): void {
    this.#finalize(text ?? this.#text, symbol);
  }
  /**
   * Finish the spinner with a failure message.
   *
   * @param text Optional message to show instead of the stored text.
   * @param symbol Optional prefix placed before the text. Defaults to "✖".
   */
  public fail(text?: string, symbol: string = "✖"): void {
    this.#finalize(text ?? this.#text, symbol);
  }

  #clearLine(): void {
    if (
      typeof this.#stream.clearLine === "function" &&
      typeof this.#stream.cursorTo === "function"
    ) {
      this.#stream.clearLine(0);
      this.#stream.cursorTo(0);
    } else {
      this.#stream.write("\r");
    }
  }

  #render(advanceFrame: boolean): void {
    if (!this.isEnabled || !this.#isSpinning) {
      return;
    }

    if (advanceFrame) {
      this.#frameIndex = (this.#frameIndex + 1) % FRAMES.length;
    }

    const frame = FRAMES[this.#frameIndex];
    this.#clearLine();
    this.#stream.write(`${frame} ${this.#text}`);
  }

  #stopInternal(): void {
    if (!this.#isSpinning) {
      return;
    }

    if (this.#interval !== undefined) {
      clearInterval(this.#interval);
      this.#interval = undefined;
    }

    this.#isSpinning = false;

    if (this.isEnabled) {
      this.#clearLine();
    }
  }

  #finalize(message: string | undefined, symbol?: string): void {
    const output = message ?? this.#text;

    if (output === "") {
      this.#stopInternal();
      return;
    }
    const prefix = symbol !== undefined ? `${symbol} ` : "";

    if (!this.isEnabled) {
      console.log(`${prefix}${output}`);
      this.#loggedFallback = true;
      return;
    }

    this.#stopInternal();

    this.#stream.write(`${prefix}${output}\n`);
  }
}

/**
 * Optional settings when creating a spinner.
 */
export interface SpinnerOptions {
  /**
   * Text shown next to the spinner.
   */
  text?: string;

  /**
   * Stream used to write frames.
   */
  stream?: NodeJS.WriteStream;

  /**
   * Whether the spinner is enabled.
   */
  enabled?: boolean;
}
export function createSpinner(options: SpinnerOptions = {}): ISpinner {
  const stream = options.stream ?? process.stdout;

  const enable =
    options.enabled ?? (stream.isTTY === true && process.env.TERM !== "dumb");

  return new Spinner(stream, enable, options.text ?? "");
}

/**
 * Helper that wraps a spinner with pause/finish helpers.
 */
export interface SpinnerController {
  /**
   * spinner instance.
   */
  readonly instance: ISpinner;
  /**
   * True while the spinner is enabled, spinning, and not finished.
   */
  readonly isActive: boolean;
  /**
   * Pause the spinner to execute an action, then resume it.
   */
  pause(action: () => void): void;
  /**
   * Stop the spinner without printing a final line.
   */
  stop(text?: string): void;
  /**
   * Stop the spinner and leave the final line on screen.
   */
  stopAndPersist(text: string, symbol?: string): void;
  /**
   * Finish the spinner with a success message.
   */
  succeed(text?: string, symbol?: string): void;
  /**
   * Finish the spinner with a failure message.
   */
  fail(text?: string, symbol?: string): void;
}

/**
 * Create a spinner controller that manages pause/finish.
 */
export function createSpinnerController(
  options: SpinnerOptions = {},
): SpinnerController {
  const instance = createSpinner(options);

  let finished = false;
  const guard = (
    action: (spinner: ISpinner) => void,
    fallback?: () => void,
  ) => {
    if (finished) {
      fallback?.();
      return;
    }

    finished = !instance.isEnabled;
    action(instance);
  };

  return {
    instance,
    get isActive() {
      return instance.isEnabled && instance.isSpinning && !finished;
    },

    pause(action: () => void) {
      instance.runWithPause(action);
    },

    stop(text?: string) {
      guard((spinner) => spinner.stop(text));
    },

    stopAndPersist(text: string, symbol?: string) {
      guard(
        (spinner) => spinner.stopAndPersist(text, symbol),
        () => {
          console.log(symbol !== undefined ? `${symbol} ${text}` : text);
        },
      );
    },
    succeed(text?: string, symbol?: string) {
      guard((spinner) => spinner.succeed(text, symbol));
    },
    fail(text?: string, symbol?: string) {
      guard((spinner) => spinner.fail(text, symbol));
    },
  };
}
