import { FactoryOptions, HardhatRuntimeEnvironment } from "hardhat/types";
declare module "mocha" {
    interface Context {
        env: HardhatRuntimeEnvironment;
    }
}
export declare function useEnvironment(fixtureProjectName: string, networkName?: string): void;
export declare function deployContract(contractName: string, constructorArguments: any[], { ethers }: HardhatRuntimeEnvironment, confirmations?: number, options?: FactoryOptions): Promise<string>;
export declare function getRandomString({ ethers }: HardhatRuntimeEnvironment): string;
//# sourceMappingURL=helpers.d.ts.map