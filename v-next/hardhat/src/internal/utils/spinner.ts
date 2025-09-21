import chalk from "chalk";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;

export interface SpinnerOptions {
  text?: string;
  stream?: NodeJS.WriteStream;
  enabled?: boolean;
}

export interface ISpinner {
  readonly isEnabled: boolean;
  start(text?: string): void;
  update(text: string): void;
  stop(text?: string): void;
  stopAndPersist(text: string, symbol?: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
}

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

  public update(nextText: string): void {
    this.#text = nextText;

    if (this.isEnabled && this.#isSpinning) {
      this.#render(false);
    } else if (!this.isEnabled && this.#loggedFallback) {
      console.log(nextText);
    }
  }

  public stop(nextText?: string): void {
    if (nextText !== undefined) {
      this.#text = nextText;
    }

    this.#stopInternal();
  }

  public stopAndPersist(text: string, symbol: string = chalk.gray("•")): void {
    this.#text = text;
    this.#finalize(text, symbol);
  }
  public succeed(text?: string): void {
    this.#finalize(text ?? this.#text, chalk.green("✔"));
  }
  public fail(text?: string): void {
    this.#finalize(text ?? this.#text, chalk.red("✖"));
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
    this.#stream.write(`${chalk.gray(frame)} ${this.#text}`);
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

export function createSpinner(options: SpinnerOptions = {}): ISpinner {
  const stream = options.stream ?? process.stdout;

  const enable =
    options.enabled ?? (stream.isTTY === true && process.env.TERM !== "dumb");

  return new Spinner(stream, enable, options.text ?? "");
}
