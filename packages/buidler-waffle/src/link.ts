import path from "path";

export function getLinkFunction() {
  const wafflePath = require.resolve("ethereum-waffle");
  const waffleCompilerPath = path.dirname(
    require.resolve("@ethereum-waffle/compiler", {
      paths: [wafflePath],
    })
  );

  const waffleCompiler = require(path.join(waffleCompilerPath, "link"));
  return waffleCompiler.link;
}
