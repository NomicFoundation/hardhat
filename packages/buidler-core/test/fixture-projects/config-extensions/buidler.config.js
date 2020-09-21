extendConfig((config, userConfig) => {
  config.values = [1];
});

extendConfig((config, userConfig) => {
  config.values.push(2);
});

module.exports = {
  solidity: "0.5.15",
};
