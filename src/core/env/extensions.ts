const extensions = [];

export function extendEnvironment(extensionFunction) {
  extensions.push(extensionFunction);
}

export function applyExtensions(environment, config) {
  for (const extension of extensions) {
    extension(environment, config);
  }
}
