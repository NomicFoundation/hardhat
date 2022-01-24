import "hardhat/types/config";
import { EtherscanConfig } from "./types";
declare module "hardhat/types/config" {
    interface HardhatUserConfig {
        etherscan?: EtherscanConfig;
    }
    interface HardhatConfig {
        etherscan: EtherscanConfig;
    }
}
//# sourceMappingURL=type-extensions.d.ts.map