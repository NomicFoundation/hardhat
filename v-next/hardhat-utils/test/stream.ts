import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, it } from "node:test";

import { createNonClosingWriter } from "../src/stream.js";

function createFixedReadable(data: Buffer[]) {
  const streamData = [...data];

  const stream = new Readable({
    encoding: "utf8",
    read(_size) {
      const chunk = streamData.shift();

      if (chunk === undefined) {
        this.push(null);
        return;
      }

      this.push(chunk);
    },
  });

  return stream;
}

function createWritable() {
  const data: string[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      data.push(chunk);

      callback();
    },
  });

  return { writable, data };
}

describe("stream", () => {
  describe("createNonClosingWriter", () => {
    const FIXTURE_DATA = [Buffer.from("a"), Buffer.from("b"), Buffer.from("c")];

    it("Should not close the actual writable when finished", async () => {
      const readable = createFixedReadable(FIXTURE_DATA);
      const { writable } = createWritable();
      const writer = createNonClosingWriter(writable);
      await pipeline(readable, writer);

      assert.equal(readable.closed, true);
      assert.equal(writer.closed, true);
      assert.equal(writable.closed, false);
    });

    it("Should write all the data to the actual writable", async () => {
      const readable = createFixedReadable(FIXTURE_DATA);
      const { writable, data } = createWritable();
      const writer = createNonClosingWriter(writable);
      await pipeline(readable, writer);

      assert.deepEqual(data, FIXTURE_DATA);
    });
  });
});
