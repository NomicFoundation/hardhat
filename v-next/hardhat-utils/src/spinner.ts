const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;

export interface ISpinner {
  readonly isEnabled: boolean;
  start(): void;
  stop(): void;
}

/**
 * Spinner that writes frames to a stream.
 *
 * Falls back to console logs when output is disabled.
 */
class Spinner implements ISpinner {
  public readonly isEnabled: boolean;
  readonly #text: string;
  #interval: NodeJS.Timeout | null = null;
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
  /**
   * Begin rendering frames or log the first message when disabled.
   */
  public start(): void {
    if (!this.isEnabled) {
      if (this.#text !== "" && !this.#loggedFallback && !this.#silent) {
        console.log(this.#text);
        this.#loggedFallback = true;
      }
      return;
    }

    this.#stopAnimation();
    let frameIndex = 0;

    const tick = () => {
      this.#render(FRAMES[frameIndex]);
      frameIndex = (frameIndex + 1) % FRAMES.length;
    };

    this.#interval = setInterval(tick, FRAME_INTERVAL_MS);
    tick();
  }

  /**
   * Stop the spinner without printing a final line.
   */
  public stop(): void {
    this.#stopAnimation();
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

  #render(frame: string): void {
    if (!this.isEnabled || this.#interval === null) {
      return;
    }
    this.#clearLine();
    this.#stream.write(`${frame} ${this.#text}`);
  }

  #finalize(message: string | undefined, symbol?: string): void {
    const output = message ?? this.#text;

    if (output === "") {
      this.#stopAnimation();
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

    this.#stopAnimation();

    this.#stream.write(`${prefix}${output}\n`);
  }

  #stopAnimation(): void {
    if (this.#interval === null) {
      return;
    }

    clearInterval(this.#interval);
    this.#interval = null;

    if (this.isEnabled) {
      this.#clearLine();
    }
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
 *   await compileContracts();
 *   spinner.stop();
 *   console.log("Compiled 12 contracts");
 * } catch (error) {
 *   spinner.stop();
 *   console.error("Compilation failed");
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
