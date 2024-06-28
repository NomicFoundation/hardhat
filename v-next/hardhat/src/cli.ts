// We enable the sourcemaps before loading main, so that everything except this
// small file is loaded with sourcemaps enabled.
process.setSourceMapsEnabled(true);

// eslint-disable-next-line no-restricted-syntax -- Allow top-level await here
const { main } = await import("./internal/cli/main.js");

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
