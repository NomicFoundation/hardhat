// Contains code copied from istanbul-lib-coverage (https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-coverage).
// The link to the original license is in the VENDORED.md file in the parent directory.

"use strict";

module.exports = function dataProperties(klass, properties) {
  properties.forEach((p) => {
    Object.defineProperty(klass.prototype, p, {
      enumerable: true,
      get() {
        return this.data[p];
      },
    });
  });
};
