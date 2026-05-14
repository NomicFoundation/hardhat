const [nodeMajor, nodeMinor] = process.versions.node
  .split(".")
  .map((n) => parseInt(n, 10));
const nativeStripTypesIsStable =
  nodeMajor > 24 || (nodeMajor === 24 && nodeMinor >= 12);

module.exports = { nativeStripTypesIsStable };
