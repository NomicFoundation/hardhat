/**
 * Run `fn` with `overrides` applied to the environment, then restore the
 * previous values, even when `fn` throws. An override of `undefined`
 * removes that variable. `fn` must be synchronous, because the restore
 * happens as soon as it returns.
 */
export function withEnv<T>(
  overrides: Record<string, string | undefined>,
  fn: () => T,
): T {
  const previous = new Map<string, string | undefined>();

  for (const [name, value] of Object.entries(overrides)) {
    previous.set(name, process.env[name]);
    setEnv(name, value);
  }

  try {
    const result = fn();

    if (result instanceof Promise) {
      throw new Error(
        "fn returned a Promise, but withEnv restores on return, so fn must be synchronous",
      );
    }

    return result;
  } finally {
    for (const [name, value] of previous) {
      setEnv(name, value);
    }
  }
}

function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
