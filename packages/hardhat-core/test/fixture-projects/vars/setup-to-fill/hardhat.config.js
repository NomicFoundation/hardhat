vars.get("REQUIRED_KEY1");
vars.has("OPTIONAL_KEY_1");
vars.get("REQUIRED_KEY2");
vars.has("OPTIONAL_KEY_2");

// A required key has a priority over an optional key (get > has)
// Check when the 'has' function comes first
vars.has("KEY3");
vars.get("KEY3");

// Check when the 'has' function comes later
vars.get("KEY4");
vars.has("KEY4");

// Vars to test ENV variables
vars.get("KEY_ENV_1");
vars.has("KEY_ENV_2");

module.exports = {
  solidity: "0.8.3",
};
