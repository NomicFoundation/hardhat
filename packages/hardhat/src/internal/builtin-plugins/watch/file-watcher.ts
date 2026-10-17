import type { FileChange } from "./watch-session.js";

import path from "node:path";

import { watch } from "chokidar";

export interface FileWatcher {
  close(): Promise<void>;
}

export interface WatchFilesOptions {
  /**
   * The absolute paths of the files and directories to watch.
   */
  paths: string[];

  /**
   * The absolute paths of directories whose contents are never reported, like
   * the artifacts and cache directories that a build writes to.
   */
  ignoredDirectories: string[];

  /**
   * How long to collect changes before reporting them, in milliseconds. Each
   * new change restarts the delay.
   */
  delayMs: number;

  onChanges: (changes: FileChange[]) => void;
}

/**
 * Returns whether the path is ignored: inside one of the ignored directories,
 * or inside a `node_modules` or `.git` directory.
 */
export function isIgnoredPath(
  absolutePath: string,
  ignoredDirectories: string[],
): boolean {
  const segments = absolutePath.split(path.sep);
  if (segments.includes("node_modules") || segments.includes(".git")) {
    return true;
  }

  return ignoredDirectories.some(
    (directory) =>
      absolutePath === directory ||
      absolutePath.startsWith(directory + path.sep),
  );
}

/**
 * Collects file changes and reports them in batches, once no new change has
 * arrived for `delayMs` milliseconds. When a file changes several times in one
 * batch, only its last change is reported.
 */
export class ChangeBatcher {
  readonly #delayMs: number;
  readonly #onChanges: (changes: FileChange[]) => void;
  readonly #pending = new Map<string, FileChange["type"]>();
  #timer: NodeJS.Timeout | undefined;

  constructor(delayMs: number, onChanges: (changes: FileChange[]) => void) {
    this.#delayMs = delayMs;
    this.#onChanges = onChanges;
  }

  public add(change: FileChange): void {
    this.#pending.set(change.absolutePath, change.type);

    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.flush(), this.#delayMs);
  }

  public flush(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;

    if (this.#pending.size === 0) {
      return;
    }

    const changes = [...this.#pending].map(([absolutePath, type]) => ({
      absolutePath,
      type,
    }));
    this.#pending.clear();

    this.#onChanges(changes);
  }

  public cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#pending.clear();
  }
}

/**
 * Watches the given paths and reports their changes in batches.
 */
export function watchFiles(options: WatchFilesOptions): FileWatcher {
  const batcher = new ChangeBatcher(options.delayMs, options.onChanges);

  const watcher = watch(options.paths, {
    persistent: true,
    ignoreInitial: true,
    ignored: (absolutePath) =>
      isIgnoredPath(absolutePath, options.ignoredDirectories),
  });

  for (const type of ["add", "change", "unlink"] as const) {
    watcher.on(type, (absolutePath: string) =>
      batcher.add({ absolutePath: path.resolve(absolutePath), type }),
    );
  }

  return {
    close: async () => {
      batcher.cancel();
      await watcher.close();
    },
  };
}
