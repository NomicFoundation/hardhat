import "@ignored/hardhat-vnext/types/config";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface HardhatConfig {
    keystore: {
      filePath: string;
    };
  }
}
