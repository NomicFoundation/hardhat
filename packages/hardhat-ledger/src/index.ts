import { extendProvider } from "hardhat/config";

extendProvider(async (provider, _config) => {
  return provider;
});
