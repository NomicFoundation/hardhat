# Enforce usage of dynamic imports for external modules (`@nomicfoundation/slow-imports/no-top-level-external-import`)

<!-- end auto-generated rule header -->

Please describe the origin of the rule here.

## Rule Details

This rule aims to make the Hardhat CLI faster by prohibiting the usage of slow imports at the root level of the modules. Instead, slow dependencies should be dynamically loaded at the specific locations where they are required. This approach ensures faster loading times for Hardhat and its plugins.

Examples of **incorrect** code for this rule:

```js
import { foo } from "slow-module";

function bar() {
  foo();
}
```

Examples of **correct** code for this rule:

```js
async function bar() {
  const { foo } = await import("slow-module");
  foo();
}
```

### Options

- `ignoreModules`: optional. Modules to ignore, as an array of strings. Node built-in modules are ignored by default.
