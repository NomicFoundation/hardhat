import type { WritableOptions } from "node:stream";

import { Writable } from "node:stream";
import { StringDecoder } from "node:string_decoder";

/**
 * Creates a Transform that writes everything to actualWritable, without closing it
 * when finished.
 *
 * This is useful to pipe things to stdout, without closing it, while being
 * able to await for the result of the pipe to finish.
 */
export function createNonClosingWriter(actualWritable: Writable): Writable {
  return new Writable({
    write(chunk, encoding, callback) {
      actualWritable.write(chunk, encoding, callback);
    },
  });
}

/**
 * A Writable that accumulates everything written to it in a string called `data`.
 */
export class StringWritable extends Writable {
  readonly #decoder: StringDecoder;

  public data: string;

  constructor(_options?: WritableOptions) {
    super(_options);
    this.#decoder = new StringDecoder(_options?.defaultEncoding);
    this.data = "";
  }

  public override _write(
    chunk: string,
    encoding: string,
    callback: () => void,
  ): void {
    if (encoding === "buffer") {
      chunk = this.#decoder.write(chunk);
    }
    this.data += chunk;
    callback();
  }

  public override _final(callback: () => void): void {
    this.data += this.#decoder.end();
    callback();
  }
}
