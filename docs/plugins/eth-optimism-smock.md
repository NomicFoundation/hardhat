---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/ethereum-optimism/smock/tree/master)
:::

**[DEPRECATED]** This repository is now deprecated in favour of the new development [monorepo](https://github.com/ethereum-optimism/optimism-monorepo).

# @eth-optimisim/smock

`smock` is a utility package that can generate mock Solidity contracts (for testing). `smock` hooks into a `ethereumjs-vm` instance so that mock contract functions can be written entirely in JavaScript. `smock` currently only supports [Hardhat](http://hardhat.org/), but will be extended to support other testing frameworks.

Some nice benefits of hooking in at the VM level:
* Don't need to deploy any special contracts just for mocking!
* All of the calls are synchronous.
* Perform arbitrary javascript logic within your return value (return a function).
* It sounds cool.

`smock` also contains `smoddit`, another utility that allows you to modify the internal storage of contracts. We've found this to be quite useful in cases where many interactions occur within a single contract (typically to save gas).

## Installation

You can easily install `smock` via `npm`:

```sh
npm install @eth-optimism/smock
```

Or via `yarn`:

```sh
yarn add @eth-optimism/smock
```

## Note on Using `smoddit`

`smoddit` requires access to the internal storage layout of your smart contracts. The Solidity compiler exposes this via the `storageLayout` flag, which you need to enable at your hardhat config.

Here's an example `hardhat.config.ts` that shows how to enable this compiler flag:

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from 'hardhat/config'

const config: HardhatUserConfig = {
  ...,
  solidity: {
    version: '0.7.0',
    settings: {
      outputSelection: {
        "*": {
            "*": ["storageLayout"],
        },
      },
    }
  },
}

export default config
```

## Table of Contents
- [API](#api)
  * [Functions](#functions)
    + [`smockit`](#-smockit-)
      - [Import](#import)
      - [Signature](#signature)
    + [`smoddit`](#-smoddit-)
      - [Import](#import-1)
      - [Signature](#signature-1)
  * [Types](#types)
    + [`smockit`](#-smockit--1)
      - [`MockContract`](#-mockcontract-)
      - [`MockContractFunction`](#-mockcontractfunction-)
      - [`MockReturnValue`](#-mockreturnvalue-)
    + [`smoddit`](#-smoddit--1)
      - [`ModifiableContractFactory`](#-modifiablecontractfactory-)
      - [`ModifiableContract`](#-modifiablecontract-)
- [Examples (smockit)](#examples--smockit-)
  * [Via `ethers.Contract`](#via--etherscontract-)
  * [Asserting Call Count](#asserting-call-count)
  * [Asserting Call Data](#asserting-call-data)
  * [Returning (w/o Data)](#returning--w-o-data-)
  * [Returning a Struct](#returning-a-struct)
  * [Returning a Function](#returning-a-function)
  * [Returning a Function (w/ Arguments)](#returning-a-function--w--arguments-)
  * [Reverting (w/o Data)](#reverting--w-o-data-)
  * [Reverting (w/ Data)](#reverting--w--data-)
- [Examples (smoddit)](#examples--smoddit-)
  * [Creating a Modifiable Contract](#creating-a-modifiable-contract)
  * [Modifying a `uint256`](#modifying-a--uint256-)
  * [Modifying a Struct](#modifying-a-struct)
  * [Modifying a Mapping](#modifying-a-mapping)
  * [Modifying a Nested Mapping](#modifying-a-nested-mapping)

## API
### Functions
#### `smockit`
##### Import
```typescript
import { smockit } from '@eth-optimism/smock'
```

##### Signature
```typescript
const smockit = async (
  spec: ContractInterface | Contract | ContractFactory,
  opts: {
    provider?: any,
    address?: string,
  },
): Promise<MockContract>
```

#### `smoddit`
##### Import
```typescript
import { smoddit } from '@eth-optimism/smock'
```

##### Signature
```typescript
const smoddit = async (
  name: string,
  signer?: any
): Promise<ModifiableContractFactory>
```

### Types
#### `smockit`
##### `MockContract`
```typescript
interface MockContract extends Contract {
  smocked: {
    [functionName: string]: MockContractFunction
  }
}
```

##### `MockContractFunction`
```typescript
interface MockContractFunction {
  calls: string[]
  will: {
    return: {
      (): void
      with: (returnValue?: MockReturnValue) => void
    }
    revert: {
      (): void
      with: (revertValue?: string) => void
    }
    resolve: 'return' | 'revert'
  }
}
```

##### `MockReturnValue`
```typescript
export type MockReturnValue =
  | string
  | Object
  | any[]
  | ((...params: any[]) => MockReturnValue)
```

#### `smoddit`
##### `ModifiableContractFactory`
```typescript
interface ModifiableContractFactory extends ContractFactory {
  deploy: (...args: any[]) => Promise<ModifiableContract>
}
```

##### `ModifiableContract`
```typescript
interface ModifiableContract extends Contract {
  smodify: {
    put: (storage: any) => Promise<void>
  }
}
```

## Examples (smockit)

### Via `ethers.Contract`
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return.with('Some return value!')

console.log(await MyMockContract.myFunction()) // 'Some return value!'
```

### Asserting Call Count
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

const MyOtherContractFactory = await ethers.getContractFactory('MyOtherContract')
const MyOtherContract = await MyOtherContract.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return.with('Some return value!')

// Assuming that MyOtherContract.myOtherFunction calls MyContract.myFunction.
await MyOtherContract.myOtherFunction()

console.log(MyMockContract.smocked.myFunction.calls.length) // 1
```

### Asserting Call Data
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

const MyOtherContractFactory = await ethers.getContractFactory('MyOtherContract')
const MyOtherContract = await MyOtherContract.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return.with('Some return value!')

// Assuming that MyOtherContract.myOtherFunction calls MyContract.myFunction with 'Hello World!'.
await MyOtherContract.myOtherFunction()

console.log(MyMockContract.smocked.myFunction.calls[0]) // 'Hello World!'
```

### Returning (w/o Data)
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return()

console.log(await MyMockContract.myFunction()) // []
```

### Returning a Struct
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return.with({
    valueA: 'Some value',
    valueB: 1234,
    valueC: true
})

console.log(await MyMockContract.myFunction()) // ['Some value', 1234, true]
```

### Returning a Function
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return.with(() => {
  return 'Some return value!'
})

console.log(await MyMockContract.myFunction()) // ['Some return value!']
```

### Returning a Function (w/ Arguments)
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.return.with((myFunctionArgument: string) => {
  return myFunctionArgument
})

console.log(await MyMockContract.myFunction('Some return value!')) // ['Some return value!']
```

### Reverting (w/o Data)
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.revert()

console.log(await MyMockContract.myFunction()) // Revert!
```

### Reverting (w/ Data)
```typescript
import { ethers } from 'hardhat'
import { smockit } from '@eth-optimism/smock'

const MyContractFactory = await ethers.getContractFactory('MyContract')
const MyContract = await MyContractFactory.deploy(...)

// Smockit!
const MyMockContract = await smockit(MyContract)

MyMockContract.smocked.myFunction.will.revert.with('0x1234')

console.log(await MyMockContract.myFunction('Some return value!')) // Revert!
```

## Examples (smoddit)

### Creating a Modifiable Contract
```typescript
import { ethers } from 'hardhat'
import { smoddit } from '@eth-optimism/smock'

// Smoddit!
const MyModifiableContractFactory = await smoddit('MyContract')
const MyModifiableContract = await MyModifiableContractFactory.deploy(...)
```

### Modifying a `uint256`
```typescript
import { ethers } from 'hardhat'
import { smoddit } from '@eth-optimism/smock'

// Smoddit!
const MyModifiableContractFactory = await smoddit('MyContract')
const MyModifiableContract = await MyModifiableContractFactory.deploy(...)

await MyModifiableContract.smodify.put({
  myInternalUint256: 1234
})

console.log(await MyMockContract.getMyInternalUint256()) // 1234
```

### Modifying a Struct
```typescript
import { ethers } from 'hardhat'
import { smoddit } from '@eth-optimism/smock'

// Smoddit!
const MyModifiableContractFactory = await smoddit('MyContract')
const MyModifiableContract = await MyModifiableContractFactory.deploy(...)

await MyModifiableContract.smodify.put({
  myInternalStruct: {
    valueA: 1234,
    valueB: true
  }
})

console.log(await MyMockContract.getMyInternalStruct()) // { valueA: 1234, valueB: true }
```

### Modifying a Mapping
```typescript
import { ethers } from 'hardhat'
import { smoddit } from '@eth-optimism/smock'

// Smoddit!
const MyModifiableContractFactory = await smoddit('MyContract')
const MyModifiableContract = await MyModifiableContractFactory.deploy(...)

await MyModifiableContract.smodify.put({
  myInternalMapping: {
    1234: 5678
  }
})

console.log(await MyMockContract.getMyInternalMappingValue(1234)) // 5678
```

### Modifying a Nested Mapping
```typescript
import { ethers } from 'hardhat'
import { smoddit } from '@eth-optimism/smock'

// Smoddit!
const MyModifiableContractFactory = await smoddit('MyContract')
const MyModifiableContract = await MyModifiableContractFactory.deploy(...)

await MyModifiableContract.smodify.put({
  myInternalNestedMapping: {
    1234: {
      4321: 5678
    }
  }
})

console.log(await MyMockContract.getMyInternalNestedMappingValue(1234, 4321)) // 5678
```
