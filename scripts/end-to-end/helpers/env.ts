const LOCAL_ENV_TOKEN = /\$\{localEnv:([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Substitute `${localEnv:NAME}` tokens in scenario `env` values with the
 * corresponding host environment variable. Throws if a referenced variable
 * is unset; an explicitly empty string is substituted as-is.
 */
export function resolveEnv(
  env: Record<string, string>,
  scenarioPath: string,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    resolved[key] = value.replace(LOCAL_ENV_TOKEN, (_, name: string) => {
      const hostValue = process.env[name];

      if (hostValue === undefined) {
        throw new Error(
          `Scenario ${scenarioPath} references host environment variable "${name}" via \${localEnv:${name}}, but it is not set`,
        );
      }

      return hostValue;
    });
  }

  return resolved;
}
