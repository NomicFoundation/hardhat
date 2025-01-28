# Environment variables

Hardhat Ignition supports special environment variables that affects how deployment works:

- `HARDHAT_IGNITION_CONFIRM_DEPLOYMENT`: if set to `false`, Hardhat Ignition won't prompt the user asking for confirmation when deploying to a live network. This prompt is already not shown when running against the local Hardhat network (chainId: 31337), but you might want to set this variable if writing fully automated scripts that leverage Hardhat Ignition.
- `HARDHAT_IGNITION_CONFIRM_RESET`: if set to `false`, Hardhat Ignition won't prompt the user asking for confirmation when overwriting the previous deployment via the `--reset` flag on Hardhat Ignition's `deploy` task.
