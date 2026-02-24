// @ts-check
const util = require("util");

/**
 * This is a backwards compatible shim because Hardhat 2 can use older
 * versions of Node.
 *
 * @type (format: import("util").InspectColor | readonly import("util").InspectColor[], text: string) => string
 */
const style = (format, text) => {
  if (util.styleText !== undefined) {
    return util.styleText(format, text);
  }

  return text;
};

const packageName = require("./package.json").name;
console.log();
console.log(
  style(["red", "bold"], "Warning:"),
  `You installed the \`latest\` version of ${style(
    "bold",
    packageName,
  )}, which does not work with Hardhat 2 nor 3.`,
);

console.log();

console.log(`To learn how to migrate to Hardhat 3, please visit:`);
console.log();
console.log(style("bold", `    https://hardhat.org/migrate-from-hardhat2`));

console.log();
console.log();

console.log(
  `To use ${style(
    "bold",
    packageName,
  )} with Hardhat 2, please install the \`hh2\` tag with npm or your package manager of choice:`,
);
console.log();
console.log(style("bold", `    npm install --save-dev "${packageName}@hh2"`));
console.log();

process.exit(1);
