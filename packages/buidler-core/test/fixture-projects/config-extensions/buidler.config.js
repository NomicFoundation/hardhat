extendConfig((config, userConfig) => {
  config.values = [1];
});

extendConfig((config, userConfig) => {
  config.values.push(2);
});

module.exports = {};
