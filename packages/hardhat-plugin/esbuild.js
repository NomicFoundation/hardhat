const esbuild = require("esbuild");
const fs = require("fs-extra");
const path = require("path");

const outdir = path.resolve(__dirname, "dist/plan/assets");
const srcdir = path.resolve(__dirname, "src/plan/assets");

const entryPoints = fs.readdirSync(srcdir).flatMap((f) => {
  const p = `${srcdir}/${f}`;

  if (/\./.test(f)) {
    return p;
  }

  return fs.readdirSync(p).map((v) => `${p}/${v}`);
});

esbuild.build({
  outdir,
  entryPoints,
  bundle: true,
  loader: {
    ".html": "copy",
    ".png": "copy",
  },
});
