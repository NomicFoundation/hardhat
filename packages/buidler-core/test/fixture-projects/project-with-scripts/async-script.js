setTimeout(() => {
  if (global.config === undefined || global.config.solc === undefined) {
    process.exit(123);
  }
}, 100);
