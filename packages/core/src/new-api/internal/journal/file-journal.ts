import fs from "fs";
import ndjson from "ndjson";

import { Journal, JournalableMessage } from "../../types/journal";

import { deserializeReplacer } from "./utils/deserialize-replacer";
import { serializeReplacer } from "./utils/serialize-replacer";

/**
 * An file-based journal.
 *
 * @beta
 */
export class FileJournal implements Journal {
  constructor(private _filePath: string) {}

  public async record(message: JournalableMessage): Promise<void> {
    return fs.promises.appendFile(
      this._filePath,
      `${JSON.stringify(message, serializeReplacer.bind(this))}\n`
    );
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
}
