const esbuild = require("esbuild");
const fs = require("fs-extra");
const path = require("path");

const outdir = path.resolve(__dirname, "dist/plan/assets");
const srcdir = path.resolve(__dirname, "src/plan/assets");

const templates = fs
  .readdirSync(`${srcdir}/templates`)
  .map((f) => `${srcdir}/templates/${f}`);

esbuild.build({
  outdir,
  entryPoints: [
    path.resolve(srcdir, "bundle.ts"),
    path.resolve(srcdir, "main.css"),
    path.resolve(srcdir, "logo-light.png"),
    path.resolve(srcdir, "logo-dark.png"),
    ...templates,
  ],
  bundle: true,
  loader: {
    ".html": "copy",
    ".png": "copy",
  },
});
