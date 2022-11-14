[going to leave this doc for future reference since some things need to be circled back to]

Config options:

Global config:

- maxRetries: number
- gasIncrementPerRetry: BigNumber
  - Increments gasPrice if legacy tx
  - Increments maxPriorityFeePerGas otherwise
  - ** proposal ** currently incrementing maxFeePerGas as well, but maybe should remove that.
  - ?? Can we even send London style tx’s currently?
- gasLimit: BigNumber
- gasPrice: BigNumber
- OR
- maxFeePerGas: BigNumber
- maxPriorityFeePerGas: BigNumber
- -
- interactive: boolean
  - Allows user to confirm each tx before it’s sent
  - Probably a later feature
- noCompile: boolean
  - Allow user to deploy without running compilation task first?
- ui: boolean
  - Allow user to deploy without the cli ui?
  - If we add this, we still need to add cli output of the new addresses
- Freeze: boolean
  - Lets user “freeze” a deployed module according to resumability rules (see resumability doc - much still TBD)
  - Requires journaling

Per-tx config:

- gasLimit: BigNumber
- gasPrice: BigNumber
- OR
- maxFeePerGas: BigNumber
- maxPriorityFeePerGas: BigNumber
- ** should not be able to mix and match legacy and London tx fields **
- ** per-tx config takes precedence if given **
