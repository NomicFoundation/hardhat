export {
  HardhatPluginError,
  NomicLabsHardhatPluginError,
} from "./internal/core/errors";
export { lazyObject, lazyFunction } from "./internal/util/lazy";
export { ensurePluginLoadedWithUsePlugin } from "./internal/core/plugins";
export { HARDHAT_NETWORK_NAME } from "./internal/constants";

// TODO-HH: reintroduce removed artifacts interface for backwards compatibility
