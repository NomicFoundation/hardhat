import {
  DeployStateExecutionCommand,
  ICommandJournal,
} from "@ignored/ignition-core";
import { BigNumber } from "ethers";
import fs from "fs";
import ndjson from "ndjson";
import { serializeError, deserializeError } from "serialize-error";

export class CommandJournal implements ICommandJournal {
  constructor(private _path: string) {}

  public async record(command: DeployStateExecutionCommand) {
    return fs.promises.appendFile(
      this._path,
      `${JSON.stringify(command, this._serializeReplacer.bind(this))}\n`
    );
  }

  public read(): AsyncGenerator<DeployStateExecutionCommand, void, unknown> {
    return this._readFromNdjsonFile(this._path);
  }

  private async *_readFromNdjsonFile(ndjsonFilePath: string) {
    if (!fs.existsSync(ndjsonFilePath)) {
      return;
    }

    const stream = fs.createReadStream(ndjsonFilePath).pipe(ndjson.parse());

    for await (const chunk of stream) {
      // TODO: we need to pull out ndjson, and come up with a different
      // line level deserializer to avoid this serialize/deserialize step
      const json = JSON.stringify(chunk);
      const deserializedChunk = JSON.parse(
        json,
        this._deserializeReplace.bind(this)
      );

      yield deserializedChunk as DeployStateExecutionCommand;
    }
  }

  private _serializeReplacer(_key: string, value: unknown) {
    if (value instanceof Set) {
      return Array.from(value);
    }

    if (value instanceof Map) {
      return Object.fromEntries(value);
    }

    if (typeof value === "bigint") {
      return `${value.toString(10)}n`;
    }

    if (value instanceof Error) {
      return serializeError(new Error(value.message));
    }

    return value;
  }

  private _deserializeReplace(_key: string, value: unknown) {
    if (typeof value === "string" && /^\d+n$/.test(value)) {
      return BigInt(value.substr(0, value.length - 1));
    }

    if (this._isSerializedBigInt(value)) {
      return BigNumber.from(value.hex);
    }

    if (typeof value === "object" && value !== null && "message" in value) {
      return deserializeError(value);
    }

    return value;
  }

  private _isSerializedBigInt(
    value: unknown
  ): value is { type: "BigNumber"; hex: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      (value as { type: string }).type === "BigNumber"
    );
  }
}
