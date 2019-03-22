import ContractCompiler from '../../src/ContractCompiler';
import {BuidlerPluginError} from "@nomiclabs/buidler/plugins";
import {assert} from "chai";
import { RunTaskFunction } from "@nomiclabs/buidler/types";

describe("ContractCompiler tests", () => {

    let run: RunTaskFunction;

    it('verify error is thrown if there is no contract name in compiled contracts', () => {
        const compiler = new ContractCompiler(async () => await {errors: [{message: 'errors'}]});
        compiler.getAbi('<contract source>', 'TestContract')
            .catch(e => assert.isTrue(e instanceof BuidlerPluginError))
    });

    it('verify error is thrown if compilation fails', () => {
        const compiler = new ContractCompiler(async () => await {contracts: {contracts: {}}});
        compiler.getAbi('<contract source>', 'TestContract')
            .catch(e => assert.isTrue(e instanceof BuidlerPluginError))
    });

    it('verify contract abi is returned if given contract exists in compilation results', async () => {
        const compiler = new ContractCompiler(async () => await {contracts: {contracts: { TestContract: {abi: [{realAbi: true}]}}}});
        const abi = await compiler.getAbi('<contract source>', 'TestContract');
        assert.deepEqual(abi, [{realAbi: true}]);
    });

});
