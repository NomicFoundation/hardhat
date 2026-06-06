import {
  EdrContext,
  GENERIC_CHAIN_TYPE,
  genericChainProviderFactory,
  L1_CHAIN_TYPE,
  l1ProviderFactory,
  l1SolidityTestRunnerFactory,
  OP_CHAIN_TYPE,
  opProviderFactory,
  opSolidityTestRunnerFactory,
} from "@nomicfoundation/edr";

// We cache the initialization *promise* (assigned synchronously, before any
// await) rather than the resolved context. This way concurrent callers share a
// single in-flight initialization and always receive a fully-registered
// context, instead of racing on a half-initialized one.
let _globalEdrContext: Promise<EdrContext> | undefined;

export async function getGlobalEdrContext(): Promise<EdrContext> {
  if (_globalEdrContext === undefined) {
    const context = createGlobalEdrContext();
    _globalEdrContext = context;

    // If initialization fails, clear the cached promise so a later call can
    // retry instead of permanently returning a rejected promise. The identity
    // guard prevents a stale rejection from wiping a newer promise created by
    // a retry.
    context.catch(() => {
      if (_globalEdrContext === context) {
        _globalEdrContext = undefined;
      }
    });
  }

  return await _globalEdrContext;
}

async function createGlobalEdrContext(): Promise<EdrContext> {
  const context = new EdrContext();

  await context.registerProviderFactory(
    GENERIC_CHAIN_TYPE,
    genericChainProviderFactory(),
  );
  await context.registerProviderFactory(L1_CHAIN_TYPE, l1ProviderFactory());
  await context.registerProviderFactory(OP_CHAIN_TYPE, opProviderFactory());
  await context.registerSolidityTestRunnerFactory(
    L1_CHAIN_TYPE,
    l1SolidityTestRunnerFactory(),
  );
  await context.registerSolidityTestRunnerFactory(
    OP_CHAIN_TYPE,
    opSolidityTestRunnerFactory(),
  );

  return context;
}
