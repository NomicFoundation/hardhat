import SolcVersions from '../../../src/solc/SolcVersions';
import {assert} from "chai";

describe("SolcVersions integration tests", () => {

    it('verify full solc version is returned', async () => {
        const fullVersion = await SolcVersions.toLong('0.5.1');
        assert.equal(fullVersion, 'v0.5.1+commit.c8a2cb62');
    });

});
