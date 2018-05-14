const extensions = [];

function extendEnvironment(extensionFunction) {
  extensions.push(extensionFunction);
}

function applyExtensions(environment, config) {
  for (const extension of extensions) {
    extension(environment, config);
  }
}

module.exports = {extendEnvironment, applyExtensions };