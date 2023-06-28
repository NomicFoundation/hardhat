/* eslint-disable no-bitwise */
import fs, { closeSync, constants, openSync, writeFileSync } from "fs";
import ndjson from "ndjson";

import { Journal, JournalableMessage } from "../../types/journal";

import { deserializeReplacer } from "./utils/deserialize-replacer";
import { serializeReplacer } from "./utils/serialize-replacer";

/**
 * A file-based journal.
 *
 * @beta
 */
export class FileJournal implements Journal {
  constructor(private _filePath: string) {}

  public record(message: JournalableMessage): void {
    this._appendJsonLine(this._filePath, message);
  }

  public async *read(): AsyncGenerator<JournalableMessage> {
    if (!fs.existsSync(this._filePath)) {
      return;
    }

    const stream = fs.createReadStream(this._filePath).pipe(ndjson.parse());

    for await (const chunk of stream) {
      const json = JSON.stringify(chunk);

      const deserializedChunk = JSON.parse(
        json,
        deserializeReplacer.bind(this)
      );

      yield deserializedChunk as JournalableMessage;
    }
  }

  private _appendJsonLine(path: string, value: unknown) {
    const flags =
      constants.O_CREAT |
      constants.O_WRONLY | // Write only
      constants.O_APPEND | // Append
      constants.O_DSYNC | // Synchronous I/O waiting for writes of content and metadata
      constants.O_DIRECT; // Minimize caching

    const fd = openSync(path, flags);

    writeFileSync(
      fd,
      `\n${JSON.stringify(value, serializeReplacer.bind(this))}`,
      "utf-8"
    );
    closeSync(fd);
  }
}
