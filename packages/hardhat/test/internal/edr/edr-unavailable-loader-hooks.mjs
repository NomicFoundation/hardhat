// Makes EDR fail to load, to simulate the installations where it does:
// `missing` as if it weren't installed, `not-callable` as if it were too old
// to have keccak256.
const EDR_SPECIFIER = "@nomicfoundation/edr";

const EDR_WITHOUT_CALLABLE_KECCAK256 =
  "data:text/javascript,export const keccak256 = 'not a function';";

export async function resolve(specifier, context, nextResolve) {
  if (specifier !== EDR_SPECIFIER) {
    return nextResolve(specifier, context);
  }

  const scenario = new URL(context.parentURL ?? "file:///").searchParams.get(
    "edr",
  );

  if (scenario === "missing") {
    const error = new Error(`Cannot find package '${specifier}'`);
    error.code = "ERR_MODULE_NOT_FOUND";
    throw error;
  }

  if (scenario === "not-callable") {
    return { url: EDR_WITHOUT_CALLABLE_KECCAK256, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
