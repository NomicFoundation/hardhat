const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
export const FRAME_INTERVAL_MS = 80;

export interface ISpinner {
  readonly isEnabled: boolean;
  start(): void;
  stop(): void;
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

/**
 * Spinner that writes frames to a stream.
 */
class Spinner implements ISpinner {
  public readonly isEnabled: boolean;
  readonly #text: string;
  #interval: NodeJS.Timeout | null = null;
  readonly #stream: NodeJS.WriteStream;

  constructor(options: SpinnerOptions) {
    this.isEnabled = options.enabled ?? true;
    this.#stream = options.stream ?? process.stdout;

    this.#text = options.text ?? "";
  }
  /**
   * Begin rendering frames when enabled.
   */
  public start(): void {
    if (!this.isEnabled) {
      return;
    }

    this.#stopAnimation();
    let frameIndex = 0;

    this.#interval = setInterval(() => {
      this.#render(FRAMES[frameIndex]);
      frameIndex = (frameIndex + 1) % FRAMES.length;
    }, FRAME_INTERVAL_MS);
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
    if (!this.isEnabled) {
      return;
    }
    this.#clearLine();
    this.#stream.write(`${frame} ${this.#text}`);
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

  return new Spinner({
    enabled: enable,
    stream,
    text: options.text,
  });
}
