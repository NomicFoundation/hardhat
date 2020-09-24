import { encode } from "cbor";
import { assert } from "chai";
import { inspect } from "util";

import {
  decodeSolcMetadata,
  readSolcMetadataLength,
  readSolcVersion,
} from "../../../src/solc/metadata";

describe("Metadata decoder tests", () => {
  const mockMetadataLengths = [0, 0x20, 100, 137, 0xff, 0x201, 523, 0xffff];

  for (const mockLength of mockMetadataLengths) {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(mockLength, 0);

    it(`decode metadata length ${mockLength}`, () => {
      const length = readSolcMetadataLength(buffer);
      assert.equal(length, mockLength, `should read length ${mockLength}`);
    });

    const gibberishBuffer = Buffer.from("testbuffer");
    const longBuffer = Buffer.concat([gibberishBuffer, buffer]);

    it(`reads length ${mockLength} from a long buffer`, () => {
      const length = readSolcMetadataLength(longBuffer);
      assert.equal(length, mockLength, `should read length ${mockLength}`);
    });
  }

  const mockPayloads = [
    "hello world",
    [1, 2, 3],
    { someKey: "test" },
    { solc: "0.6.4", ipfs: "a hash" },
  ];

  for (const mockPayload of mockPayloads) {
    const mockMetadata = Buffer.from(encode(mockPayload));
    const length = Buffer.alloc(2);
    length.writeUInt16BE(mockMetadata.length, 0);

    const metadataBuffer = Buffer.concat([mockMetadata, length]);

    it(`reads ${inspect(
      mockPayload
    )} ${typeof mockPayload} from metadata`, async () => {
      const decodedPayload = await decodeSolcMetadata(metadataBuffer);
      assert.deepEqual(decodedPayload, mockPayload, `decoding failed`);
    });
  }

  const mockSolcMetadataMappings = [
    { solc: Buffer.from([0, 5, 11]), bzzr1: "a hash" },
    { solc: Buffer.from([0, 5, 14]), bzzr1: "another hash" },
    { solc: Buffer.from([0, 6, 7]), ipfs: "yah" },
    { solc: Buffer.from([0, 7, 0]), ipfs: "the hash" },
  ];
  const initialPadding = Buffer.from(
    "buidler-etherscan test padding with numbers 1234567890"
  );

  for (const mockSolcMetadataMapping of mockSolcMetadataMappings) {
    const mockMetadata = Buffer.from(encode(mockSolcMetadataMapping));
    const length = Buffer.alloc(2);

    length.writeUInt16BE(mockMetadata.length, 0);

    const metadataBuffer = Buffer.concat([
      initialPadding,
      mockMetadata,
      length,
    ]);

    it(`reads solc version from ${inspect(
      mockSolcMetadataMapping
    )} ${typeof mockSolcMetadataMapping}`, async () => {
      const decodedPayload = await readSolcVersion(metadataBuffer);
      const [major, minor, patch] = mockSolcMetadataMapping.solc;
      assert.equal(decodedPayload, `${major}.${minor}.${patch}`);
    });
  }

  it("fails when given metadata of zero length", async () => {
    const length = Buffer.from([0, 0]);
    return decodeSolcMetadata(length).then(
      () => {
        assert.fail("should have thrown");
      },
      (error) => {
        assert.instanceOf(error, Error);
      }
    );
  });
});
