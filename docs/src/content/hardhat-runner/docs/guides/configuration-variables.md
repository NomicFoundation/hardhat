# Configuration variables

A Hardhat project can use configuration variables for user-specific values or for data that shouldn't be included in the code repository.

These variables are set via tasks in the `vars` scope and can be retrieved in the config using the `vars` object. For example, if you do this in your config:

```js
const INFURA_API_KEY = vars.get("INFURA_API_KEY");

module.exports = {
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    },
  },
};
```

And then you set the `INFURA_API_KEY` with:

```
$ npx hardhat vars set INFURA_API_KEY
✔ Enter value: ********************************
```

Then the URL for the `sepolia` network will be formed with the configuration variable you set.

:::warning

Configuration variables are stored in plain text on your disk. Avoid using this feature for data you wouldn’t normally save in an unencrypted file. Run `npx hardhat vars path` to find the storage's file location.

:::

## Managing configuration variables

Use the tasks under the `vars` scope to manage your configuration variables.

### `vars set`

Assigns a value to a configuration variable, or creates one if it doesn't exist:

```
$ npx hardhat vars set TEST_API_KEY
```

### `vars get`

Displays a configuration variable's value:

```
$ npx hardhat vars get TEST_API_KEY
1234abcd1234abcd1234abcd1234abcd
```

### `vars list`

Prints all the configuration variables stored on your machine:

```
$ npx hardhat vars list
TEST_API_KEY
TEST_PK
```

### `vars delete`

Removes a configuration variable:

```
$ npx hardhat vars delete TEST_API_KEY
```

## Using variables in your configuration file

Configuration variables that you have previously stored can be retrieved within your Hardhat configuration file. Use the `vars.get` method to obtain them:

```js
const { vars } = require("hardhat/config");

const INFURA_API_KEY = vars.get("INFURA_API_KEY");

module.exports = {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [vars.get("TEST_PK")],
  },
};
```

For variables that may not exist, you can specify a default value as the second parameter:

```js
const salt = vars.get("DEPLOY_SALT", "12345");
```

You can also use `vars.has` to check if a variable exists:

```js
const accounts = vars.has("TEST_PK") ? [vars.get("TEST_PK")] : [];
```

## Setting up variables for a project

The `vars setup` task lists all the configuration variables used by the project. This is useful to know which ones you need to set up before running the project.

### Mandatory vs. optional variables

The output of `vars setup` separates mandatory variables from optional ones.

A variable is considered mandatory if the configuration cannot be loaded without it. This happens when you retrieve the variable without a default value:

```js
vars.get("MANDATORY_VARIABLE");
```

However, when combined with `vars.has`, the variable is considered optional:

```js
vars.has("OPTIONAL_VARIABLE") ? [vars.get("OPTIONAL_VARIABLE")] : [];
```

Variables always used with a default value are also considered optional:

```js
vars.get("ANOTHER_OPTIONAL_VARIABLE", "DEFAULT_VALUE");
```

## Migrating from `dotenv`

If you are using `dotenv`, we recommend you migrate to our built-in configuration variables manager. This will make it easier to share values across various Hardhat projects, and will minimize the risk of exposing sensitive data by accidentally uploading a `.env` file to a public repository.

To migrate from `dotenv`, follow these steps:

1. Replace `process.env.KEY` references in your configuration with `vars.get("KEY")`. Replace conditions like `process.env.KEY !== undefined` with `vars.has("KEY")`
2. Run `npx hardhat vars setup` to identify all the variables that are used by your project.
3. Use `npx hardhat vars set` for each variable as indicated by the setup task.
4. After substituting all instances of `process.env`, you may uninstall the `dotenv` package and remove its import from your configuration.

## Overriding configuration variables with environment variables

Environment variables prefixed with `HARDHAT_VAR_` can be used to override the values of configuration variables.

For example, if your config uses `vars.get("MY_KEY")` and you run Hardhat with the environment variable `HARDHAT_VAR_MY_KEY` set to some value, then that value is going to be used:

```sh
HARDHAT_VAR_MY_KEY=123 npx hardhat some-task
```

Keep in mind that changes to environment variables during the configuration execution are not recognized. For example, if you do this:

```js
process.env.HARDHAT_VAR_MY_KEY = "123";
console.log(vars.get("MY_KEY"));
```

Then the value of `MY_KEY` _won't_ be `"123"`.
