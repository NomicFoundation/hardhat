# Environment variables

You can use certain environment variables to configure Hardhat's behavior.

## Setting parameters with environment variables

Every global flag or parameter accepted by Hardhat can also be specified using an environment variable. For example, to select the network you normally do:

```bash
npx hardhat ignition deploy ./ignition/modules/LockModule.js --network localhost
```

But you can get the same behavior by setting the `HARDHAT_NETWORK` environment variable:

```bash
HARDHAT_NETWORK=localhost npx hardhat ignition deploy ./ignition/modules/LockModule.js
```

In general, each flag or parameter of the form `--some-option` can be set using the `HARDHAT_SOME_OPTION` environment variable. For flags, which don't accept values, you can enable or disable them by setting them to `true` or `false`:

```bash
HARDHAT_VERBOSE=true npx hardhat ignition deploy ./ignition/modules/LockModule.js
```

Options specified with the `--some-option` form have precedence over environment variables. That is, if you run:

```bash
HARDHAT_NETWORK=mainnet npx hardhat ignition deploy ./ignition/modules/LockModule.js --network localhost
```

then the `localhost` network is going to be used.

## Other environment variables

Besides the environment variables that correspond to global parameters, there are some special environment variables that affect how Hardhat works. Variables starting with `HARDHAT_EXPERIMENTAL_` are experimental and could be removed in future versions.

- `HARDHAT_DISABLE_TELEMETRY_PROMPT`: if set to `true`, Hardhat won't prompt the user asking for telemetry consent. This prompt is already not shown in CIs or when the output is not a TTY, but in some cases (like automated scripts that write to stdout) you might want to set this variable.
- `HARDHAT_EXPERIMENTAL_ALLOW_NON_LOCAL_INSTALLATION`: if set to `true`, Hardhat won't check if the `hardhat` package is locally installed.
