/* eslint-disable no-bitwise -- we are intentionally working with to work with the file-system API */
import type { Journal } from "./types/index.js";
import type { ExecutionEventListener } from "../../types/execution-events.js";
import type { JournalMessage } from "../execution/types/messages.js";

import fs, { closeSync, constants, openSync, writeFileSync } from "node:fs";

import { parse } from "ndjson";

import { deserializeReplacer } from "./utils/deserialize-replacer.js";
import { emitExecutionEvent } from "./utils/emitExecutionEvent.js";
import { serializeReplacer } from "./utils/serialize-replacer.js";

/**
 * A file-based journal.
 *
 * @beta
 */
export class FileJournal implements Journal {
  constructor(
    private readonly _filePath: string,
    private readonly _executionEventListener?:
      | ExecutionEventListener
      | undefined
  ) {}

  public record(message: JournalMessage): void {
    this._log(message);

    this._appendJsonLine(this._filePath, message);
  }

  public async *read(): AsyncGenerator<JournalMessage> {
    if (!fs.existsSync(this._filePath)) {
      return;
    }

    const stream = fs.createReadStream(this._filePath).pipe(parse());

    for await (const chunk of stream) {
      const json = JSON.stringify(chunk);

      const deserializedChunk = JSON.parse(
        json,
        deserializeReplacer.bind(this)
      );

      yield deserializedChunk as JournalMessage;
    }
  }

  private _appendJsonLine(path: string, value: JournalMessage) {
    const flags =
      constants.O_CREAT |
      constants.O_WRONLY | // Write only
      constants.O_APPEND | // Append
      constants.O_DSYNC; // Synchronous I/O waiting for writes of content and metadata

    const fd = openSync(path, flags);

    writeFileSync(
      fd,
      `\n${JSON.stringify(value, serializeReplacer.bind(this))}`,
      "utf-8"
    );
    closeSync(fd);
  }

  private _log(message: JournalMessage): void {
    if (this._executionEventListener !== undefined) {
      emitExecutionEvent(message, this._executionEventListener);
    }
  }
}
