import { Writable } from "stream";

/**
 * This class is a writable stream that buffers everything written into it, and
 * keeps it in its [[buffer]] field.
 */
export class WritableBufferStream extends Writable {
  public buffer: Buffer = Buffer.from([]);

  constructor() {
    super({
      write: (chunk, encoding, next) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        next();
      },
    });
  }
}
