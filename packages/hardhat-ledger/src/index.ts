import { extendProvider } from "hardhat/config";
import { LedgerProvider } from "./provider";

extendProvider((provider, _config) =>
  LedgerProvider.create({ path: "44'/60'/0'/0" }, provider)
);
