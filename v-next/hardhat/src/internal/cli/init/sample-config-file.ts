// TODO: test that is testing the last version of solidity
const solidityVersion = "0.8.24";

export const EMPTY_HARDHAT_CONFIG: string = `import type { HardhatUserConfig } from "@nomicfoundation/hardhat/config";

export default {
  solidity: "${solidityVersion}",
} satisfies HardhatUserConfig;
`;
