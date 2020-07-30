export const randomHash = () =>
  new Array(64).fill(0).map(randomHexDigit).join("");
const randomHexDigit = () => Math.floor(Math.random() * 16).toString(16);
