---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/zemse/hardhat-tracer/tree/master)
:::

# hardhat-tracer 🕵️

Allows you to see emitted events when running your tests.

## Installation

**Step 1:** Install the package

```
npm i hardhat-tracer
```

**Step 2:** Add to your `hardhat.config.js` file

```
require("hardhat-tracer");
```

## Usage

Just add the `--logs` after your test command.

```
npx hardhat test --logs
```

![Console test](https://imgur.com/download/KB72yBV/)

### Address name tags

You can set display names / name tags for address by adding new entry to `hre.tracer.nameTags` object in your test cases, see following example:

```ts
hre.tracer.nameTags[this.arbitrager.address] = "Arbitrager";
```
