/* eslint-disable no-bitwise */
import fs, { closeSync, constants, openSync, writeFileSync } from "fs";
import { parse } from "ndjson";

import { ExecutionEventListener } from "../../types/execution-events";
import { JournalMessage } from "../execution/types/messages";

import { Journal } from "./types";
import { deserializeReplacer } from "./utils/deserialize-replacer";
import { emitExecutionEvent } from "./utils/emitExecutionEvent";
import { serializeReplacer } from "./utils/serialize-replacer";

/**
 * A file-based journal.
 *
 * @beta
 */
export class FileJournal implements Journal {
  constructor(
    private _filePath: string,
    private _executionEventListener?: ExecutionEventListener | undefined,
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
        deserializeReplacer.bind(this),
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
      "utf-8",
    );
    closeSync(fd);
  }

  private _log(message: JournalMessage): void {
    if (this._executionEventListener !== undefined) {
      emitExecutionEvent(message, this._executionEventListener);
    }
  }
}
