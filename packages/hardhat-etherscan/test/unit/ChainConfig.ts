import { assert } from "chai";
import { chainConfig } from "../../src/ChainConfig";

describe("Chain Config", () => {
  it("should have no duplicate chain ids", () => {
    const chainIds: number[] = Object.values(chainConfig).map(
      (config) => config.chainId
    );
    //remove known duplicates
    const filteredChainIds = chainIds.filter(obj => 
                    obj !== 100 //xdai is now gnosis
                    ); 

    const uniqueIds = [...new Set(filteredChainIds)];

    assert.notEqual(0, uniqueIds.length);
    assert.equal(uniqueIds.length, filteredChainIds.length);
  });
});
