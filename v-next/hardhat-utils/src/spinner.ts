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
  readonly #silent: boolean;

  constructor(
    stream: NodeJS.WriteStream,
    enabled: boolean,
    initialText: string,
    silent: boolean = false,
  ) {
    this.isEnabled = enabled;
    this.#stream = stream;

    this.#text = initialText;
    this.#silent = silent;
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
      if (this.#text !== "" && !this.#loggedFallback && !this.#silent) {
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
    } else if (!this.isEnabled && this.#loggedFallback && !this.#silent) {
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
      if (!this.#silent) {
        console.log(`${prefix}${output}`);
        this.#loggedFallback = true;
      }
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

  /**
   * Suppress console fallbacks when the spinner is disabled.
   */
  silent?: boolean;
}

/**
 * Create a spinner instance.
 *
 * @example
 * ```typescript
 * const spinner = createSpinner({ text: "Compiling…" });
 * spinner.start();
 *
 * try {
 *   spinner.update("Compiling contracts…");
 *   await compileContracts();
 *
 *   spinner.runWithPause(() => {
 *     console.log("Verification step starting");
 *   });
 *
 *   await verifyContracts();
 *   spinner.succeed("Compilation finished");
 * } catch (error) {
 *   spinner.fail("Compilation failed");
 * }
 * ```
 *
 * @param options  Optional spinner configuration.
 * @returns {Spinner} A spinner instance.
 */
export function createSpinner(options: SpinnerOptions = {}): ISpinner {
  const stream = options.stream ?? process.stdout;

  const enable =
    options.enabled ?? (stream.isTTY === true && process.env.TERM !== "dumb");

  return new Spinner(
    stream,
    enable,
    options.text ?? "",
    options.silent ?? false,
  );
}
