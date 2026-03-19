import { defineConfig } from "hardhat/config";
import hardhatSolx from "@nomicfoundation/hardhat-solx";

export default defineConfig({
  plugins: [hardhatSolx],
  solidity: "0.8.33",
});
