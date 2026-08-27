// Makes EDR fail to load, to simulate an installation where it isn't present.
export async function resolve(specifier, context, nextResolve) {
  if (specifier !== "@nomicfoundation/edr") {
    return nextResolve(specifier, context);
  }

  const error = new Error(`Cannot find package '${specifier}'`);
  error.code = "ERR_MODULE_NOT_FOUND";
  throw error;
}
