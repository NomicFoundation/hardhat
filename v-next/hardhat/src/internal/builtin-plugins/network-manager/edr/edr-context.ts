import {
  EdrContext,
  GENERIC_CHAIN_TYPE,
  genericChainProviderFactory,
  L1_CHAIN_TYPE,
  l1ProviderFactory,
  OPTIMISM_CHAIN_TYPE,
  optimismProviderFactory,
} from "@ignored/edr-optimism";

let _globalEdrContext: EdrContext | undefined;

export async function getGlobalEdrContext(): Promise<EdrContext> {
  if (_globalEdrContext === undefined) {
    _globalEdrContext = new EdrContext();
    await _globalEdrContext.registerProviderFactory(
      GENERIC_CHAIN_TYPE,
      genericChainProviderFactory(),
    );
    await _globalEdrContext.registerProviderFactory(
      L1_CHAIN_TYPE,
      l1ProviderFactory(),
    );
    await _globalEdrContext.registerProviderFactory(
      OPTIMISM_CHAIN_TYPE,
      optimismProviderFactory(),
    );
  }

  return _globalEdrContext;
}
