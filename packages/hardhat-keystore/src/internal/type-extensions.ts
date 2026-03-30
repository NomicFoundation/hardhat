import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface HardhatConfig {
    keystore: {
      filePath: string;
      devFilePath: string;
      devPasswordFilePath: string;
    };
  }
}
