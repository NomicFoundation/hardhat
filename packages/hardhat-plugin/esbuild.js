const esbuild = require("esbuild");
const path = require("path");

const outdir = path.resolve(__dirname, "dist/plan/assets");
const srcdir = path.resolve(__dirname, "src/plan/assets");

esbuild.build({
  outdir,
  entryPoints: [
    path.resolve(srcdir, "bundle.ts"),
    path.resolve(srcdir, "main.css"),
    path.resolve(srcdir, "index.html"),
    path.resolve(srcdir, "vertex.html"),
  ],
  bundle: true,
  loader: {
    ".html": "copy",
  },
});
