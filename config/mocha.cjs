function computeNoStripTypesFlag(nodeVersion) {
  const [major, minor, patch] = nodeVersion
    .split(".")
    .map((part) => Number.parseInt(part, 10));

  if (![major, minor, patch].every(Number.isInteger)) {
    throw new TypeError(`Invalid Node.js version: ${nodeVersion}`);
  }

  const gte = (M, m, p = 0) =>
    major > M || (major === M && (minor > m || (minor === m && patch >= p)));

  const lt = (M, m, p = 0) => !gte(M, m, p);

  // Stable rename:
  // Node >= 24.12.0, and all Node 25+ where this feature is present.
  if (gte(24, 12, 0)) {
    return "no-strip-types";
  }

  // Type stripping enabled by default in:
  // - Node 22 >= 22.18.0
  // - Node 23 >= 23.6.0
  // - Node 24 < 24.12.0
  if (
    (major === 22 && gte(22, 18, 0)) ||
    (major === 23 && gte(23, 6, 0)) ||
    (major === 24 && lt(24, 12, 0))
  ) {
    return "no-experimental-strip-types";
  }

  return "";
}

const noStripTypesFlag = computeNoStripTypesFlag(process.versions.node);

module.exports = { noStripTypesFlag };
