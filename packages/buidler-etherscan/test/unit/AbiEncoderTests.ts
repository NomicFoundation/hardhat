import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { assert } from "chai";

import AbiEncoder from "../../src/AbiEncoder";

describe("AbiEncoder tests", () => {
  it("test result if there is no constructor in abi definition", () => {
    assert.isEmpty(AbiEncoder.encodeConstructor([], []));
    assert.isEmpty(AbiEncoder.encodeConstructor([], ["test"]));
  });

  it("test if error trown when wrong number of arguments given", () => {
    assert.throws(
      () =>
        AbiEncoder.encodeConstructor(
          [
            {
              inputs: [],
              type: "constructor"
            }
          ],
          ["test"]
        ),
      BuidlerPluginError
    );
  });

  it("should properly abi encode values", () => {
    const expectedConstructorArgumentsEncoded =
      "000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000ea000000000000000000000000022198a476afd450dafda11551ea79dc452b40ee00000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000";
    const result = AbiEncoder.encodeConstructor(
      [
        {
          inputs: [{ type: "string" }, { type: "uint" }, { type: "address" }],
          type: "constructor"
        }
      ],
      ["test", "234", "0x022198a476afD450DafDa11551EA79Dc452b40eE"]
    );
    assert.equal(result, expectedConstructorArgumentsEncoded);
  });
});
