const fs = require("fs-extra");
const glob = require("fast-glob");
const { resolve, dirname, relative } = require("path");

const srcRoot = resolve(__dirname, "src");
const dir = fs.readdirSync(srcRoot);
console.log("dir");
console.log(dir);

const pwd = process.cwd();
const configFile = resolve(pwd, "tsconfig.json");
const {
  compilerOptions: { baseUrl },
} = require(configFile);
// const srcRoot = resolve("./src");

const configDir = dirname(configFile);

const basePath = resolve(configDir, baseUrl);
const outPath = resolve(__dirname, "dist", "src");

const outFileToSrcFile = (x) => resolve(srcRoot, relative(outPath, x));

const toRelative = (from, to) => {
  const rel = relative(from, to);
  return (rel.startsWith(".") ? rel : `./${rel}`).replace(/\\/g, "/");
};

const exts = [".js", ".jsx", ".ts", ".tsx", ".d.ts", ".json"];

const aliases = [];

for (let i = 0; i < dir.length; i++) {
  const item = dir[i];
  if (/\.ts|\.js/.test(item)) continue;
  aliases.push({
    prefix: `${item}/`,
    path: resolve(basePath, item),
    name: item,
  });
}

console.log("aliases");
console.log(aliases);

const absToRel = (modulePath, outFile) => {
  const len = aliases.length;
  for (let i = 0; i < len; i++) {
    const { prefix, path } = aliases[i];

    if (modulePath.startsWith(prefix)) {
      const modulePathRel = modulePath.substring(prefix.length);
      const srcFile = outFileToSrcFile(outFile);
      const moduleSrc = resolve(path, modulePathRel);
      if (
        fs.existsSync(moduleSrc) ||
        exts.some((ext) => fs.existsSync(moduleSrc + ext))
      ) {
        const rel = toRelative(dirname(srcFile), moduleSrc);
        return rel;
      }
    }
  }
};

const replaceImportStatement = (orig, matched, outFile) => {
  const index = orig.indexOf(matched);

  return (
    orig.substring(0, index) +
    absToRel(matched, outFile) +
    orig.substring(index + matched.length)
  );
};

const aliasNames = aliases.map(({ name }) => name).join("|");
const requireRegex = new RegExp(
  `(?:import|require)\\(['"]((${aliasNames})[^'"]*)['"]\\).*`,
  "g"
);
const importRegex = new RegExp(
  `(?:import|from) ['"]((${aliasNames})[^'"]*)['"].*`,
  "g"
);

const replaceAlias = (text, outFile) =>
  text
    .replace(requireRegex, (orig, matched) =>
      replaceImportStatement(orig, matched, outFile)
    )
    .replace(importRegex, (orig, matched) =>
      replaceImportStatement(orig, matched, outFile)
    );

const files = glob
  .sync(`${outPath}/**/*.{js,jsx,ts,tsx}`, {
    dot: true,
    onlyFiles: true,
  })
  .map((x) => resolve(x));

console.log("files");
console.log(files);

const len = files.length;
for (let i = 0; i < len; i++) {
  const file = files[i];
  const text = fs.readFileSync(file, "utf8");
  const newText = replaceAlias(text, file);
  if (text !== newText) {
    fs.writeFileSync(file, newText, "utf8");
  }
}
