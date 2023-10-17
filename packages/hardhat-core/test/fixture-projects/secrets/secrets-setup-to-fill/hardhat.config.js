secrets.get("REQUIRED_KEY1");
secrets.has("OPTIONAL_KEY_1");
secrets.get("REQUIRED_KEY2");
secrets.has("OPTIONAL_KEY_2");

// A required key has a priority over an optional key (get > has)
secrets.has("KEY3");
secrets.get("KEY3");

module.exports = {
  solidity: "0.8.3",
};
