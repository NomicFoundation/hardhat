type EnvExtensionFunction = (env: any, config: any) => void;

const extensions: EnvExtensionFunction[] = [];

export function extendEnvironment(extensionFunction: EnvExtensionFunction) {
  extensions.push(extensionFunction);
}

export function applyExtensions(environment, config) {
  for (const extension of extensions) {
    extension(environment, config);
  }
}
