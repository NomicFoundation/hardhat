setTimeout(() => {
  if (global.config === undefined || global.config.solidity === undefined) {
    process.exit(123);
  }
}, 100);
