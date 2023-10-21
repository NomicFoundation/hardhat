vars.get("REQUIRED_KEY1");
vars.has("OPTIONAL_KEY_1");
vars.get("REQUIRED_KEY2");
vars.has("OPTIONAL_KEY_2");

// A required key has a priority over an optional key (get > has)
vars.has("KEY3");
vars.get("KEY3");

module.exports = {
  solidity: "0.8.3",
};
