import fsPromises from "node:fs/promises";

export interface WatcherEvent {
  eventType: "change" | "rename";
  filename: string | null;
}

export type WatcherEventHandler = (event: WatcherEvent) => Promise<void>;

export class Watcher {
  readonly #abortController: AbortController;
  readonly #eventLoop: Promise<void>;

  constructor(path: string, eventHandler: WatcherEventHandler) {
    this.#abortController = new AbortController();

    const events = fsPromises.watch(path, {
      recursive: true,
      persistent: false,
      signal: this.#abortController.signal,
    });

    this.#eventLoop = new Promise(async () => {
      for await (const event of events) {
        await eventHandler(event);
      }
    });
  }

  public close(): Promise<void> {
    this.#abortController.abort();
    return this.#eventLoop;
  }
}
