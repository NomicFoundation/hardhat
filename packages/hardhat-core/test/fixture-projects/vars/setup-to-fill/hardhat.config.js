//
// The following keys are not stored in the variables file
//

// Same key
vars.has("nonExistingKey1");
vars.get("nonExistingKey1");

vars.get("nonExistingKey2", "defaultValue2");

vars.get("nonExistingKey3");

vars.has("nonExistingKey4");

// vars.get "overwrites" vars.get with default value
vars.get("nonExistingKey5", "defaultValue5");
vars.get("nonExistingKey5");

//
// The following keys are stored in the variables file
//

// Same key
vars.has("key1");
vars.get("key1");

// Key exists and there is a default value
vars.get("key2", "defaultValue");

vars.get("key3");

vars.has("key4");

// vars.get "overwrites" vars.get with default value
vars.get("key5", "defaultValue");
vars.get("key5");

//
// The following keys are passed as ENV variables
//
vars.get("KEY_ENV_1");
vars.has("KEY_ENV_2");

module.exports = {
  solidity: "0.8.3",
};
