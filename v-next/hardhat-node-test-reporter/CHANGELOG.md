# @nomicfoundation/hardhat-node-test-reporter

## 3.0.3

### Patch Changes

- [#8054](https://github.com/NomicFoundation/hardhat/pull/8054) [`91e1945`](https://github.com/NomicFoundation/hardhat/commit/91e1945227db9fb55940dd8c15ec93ae3b12c533) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Test 3: This will create an unintended bump in node-test-retunner of hardhat, which will be removed, but the entire "Updated dependencies" section will be kept because we also bump hardhat-node-test-reporter

## 3.0.2

### Patch Changes

- 7697451: Test summaries are now merged when running multiple test tasks ([#7053](https://github.com/NomicFoundation/hardhat/issues/7053))

## 3.0.1

### Patch Changes

- ef714f7: Fix test error `cause` chains being cut off. The default is now 10 `cause`s (up from 3). In CI environments, it's 100.

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
