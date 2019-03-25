import {TASK_COMPILE_RUN_COMPILER} from "@nomiclabs/buidler/builtin-tasks/task-names";
import {BuidlerPluginError} from "@nomiclabs/buidler/plugins";
import {RunTaskFunction} from "@nomiclabs/buidler/types";

export default class ContractCompiler {
    constructor(private readonly runTask: RunTaskFunction) {
    }

    public async getAbi(source: string, contractName: string): Promise<any> {
        return (await this.compile(source, contractName)).abi;
    }

    public async compile(source: string, contractName: string): Promise<{ abi: Array<any>, bytecode: string }> {
        const compilationResult = await this.runTask(TASK_COMPILE_RUN_COMPILER, {
            input: this.getSolcInput(source)
        });
        if (compilationResult.errors) {
            throw new BuidlerPluginError(
                "Failed to compile: " + JSON.stringify(compilationResult.errors)
            );
        }
        const contracts: any = compilationResult.contracts.contracts;
        for (const contract in contracts) {
            if (contracts.hasOwnProperty(contract) && contract === contractName) {
                return {
                    abi: contracts[contract].abi,
                    bytecode: contracts[contract].evm.bytecode.object
                };
            }
        }
        throw new BuidlerPluginError(
            "Given contract name doesn't exist in sources"
        );
    }

    private getSolcInput(source: string) {
        return {
            language: "Solidity",
            sources: {
                contracts: {
                    content: source
                }
            },

            settings: {
                outputSelection: {
                    "*": {
                        "*": ["*"]
                    }
                }
            }
        };
    }
}
