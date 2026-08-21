# solx test-execution evaluation — running matrix

solx pin: 0.1.8. Legend: P/F/S = passing/failing/skipped.

| scenario | runner | pair | verdict | solx | control | solx-only | both | EIP-170 | flaky |
|---|---|---|---|---|---|--:|--:|--:|--:|
| 1inch-aqua-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 49P/0F/0S | 49P/0F/0S | 0 | 0 | 0 | 0 |
| 1inch-aqua-solx | solidity | solx-0.1.8 vs default | **pass** | 49P/0F/0S | 49P/0F/0S | 0 | 0 | 0 | 0 |
| 1inch-swap-vm-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **cannot-compile** | no summary (exit 1) | 706P/0F/0S | 0 | 0 | 0 | 0 |
| aave-v4-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass-uncontrolled** | 1559P/0F/1S | no summary (exit 1) | 0 | 0 | 0 | 0 |
| aave-v4-solx | solidity | solx-0.1.8 vs default | **pass** | 1559P/0F/1S | 1559P/0F/1S | 0 | 0 | 0 | 0 |
| ens-verifiable-factory-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 23P/0F/0S | 23P/0F/0S | 0 | 0 | 0 | 0 |
| ens-verifiable-factory-solx | solidity | solx-0.1.8 vs default | **pass** | 23P/0F/0S | 23P/0F/0S | 0 | 0 | 0 | 0 |
| graph-horizon-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 574P/0F/2S | 574P/0F/2S | 0 | 0 | 0 | 0 |
| graph-horizon-solx | solidity | solx-0.1.8 vs default | **pass** | 574P/0F/2S | 574P/0F/2S | 0 | 0 | 0 | 0 |
| lidofinance-core-solx | mocha | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 1266P/0F/1S | 1266P/0F/1S | 0 | 0 | 0 | 0 |
| openzeppelin-contracts-0.34 | mocha | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 7654P/0F/1S | 7654P/0F/1S | 0 | 0 | 0 | 0 |
| openzeppelin-contracts-0.34 | mocha | solx-0.1.8 vs default | **pass** | 7654P/0F/1S | 7654P/0F/1S | 0 | 0 | 0 | 0 |
| openzeppelin-contracts-0.34 | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 347P/0F/0S | 346P/1F/0S | 0 | 0 | 0 | 0 |
| openzeppelin-contracts-0.34 | solidity | solx-0.1.8 vs default | **pass** | 347P/0F/0S | 347P/0F/0S | 0 | 0 | 0 | 0 |
| solady-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 2040P/1F/0S | 2040P/1F/0S | 0 | 1 | 0 | 0 |
| solady-solx | solidity | solx-0.1.8 vs default | **pass** | 2040P/1F/0S | 2040P/1F/0S | 0 | 1 | 0 | 0 |
| uniswap-v4-core-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | **pass** | 598P/0F/0S | 598P/0F/0S | 0 | 0 | 0 | 0 |
| uniswap-v4-core-solx | solidity | solx-0.1.8 vs default | **pass** | 598P/0F/0S | 598P/0F/0S | 0 | 0 | 0 | 0 |

## Deployed bytecode sizes (EIP-170 limit 24576 B)

Scoped to non-test sources compiled at solc 0.8.34. Contracts from a repo's test tree are deployed by the Solidity test runner with the code-size limit lifted, so they are exempt from the limit and are shown in their own column rather than counted as over-limit. Artifacts from other solc versions a repo also compiles (lidofinance-core builds six) are excluded entirely: neither compiler under comparison produced them. Sizes are read off the artifacts, not the warning text. A cell reads `unattributed` when the run wrote no build-info at solc 0.8.34 to scope by. Mocks and generated test-support contracts that live in source trees rather than a test tree are still counted (openzeppelin's contracts-exposed wrappers, graph-horizon's and lidofinance-core's contracts/mocks): the limit does apply to them. Read a row as a statement about everything the repo compiles, not about its public library surface.

| scenario | runner | pair | solx max | solx over | control max | control over | largest under solx | solx test-harness max (exempt) |
|---|---|---|--:|--:|--:|--:|---|--:|
| 1inch-aqua-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | 3898 B | 0 | 4618 B | 0 | src/AquaRouter.sol:AquaRouter | 33224 B |
| 1inch-aqua-solx | solidity | solx-0.1.8 vs default | 3690 B | 0 | 5185 B | 0 | src/AquaRouter.sol:AquaRouter | 27752 B |
| 1inch-swap-vm-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | unattributed | unattributed | 36743 B | 5 | unattributed | unattributed |
| aave-v4-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | 27809 B | 1 | unattributed | unattributed | src/spoke/instances/SpokeInstance.sol:SpokeInstance | 243306 B |
| aave-v4-solx | solidity | solx-0.1.8 vs default | 27809 B | 1 | 24291 B | 0 | src/spoke/instances/SpokeInstance.sol:SpokeInstance | 210587 B |
| ens-verifiable-factory-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | 3544 B | 0 | 2582 B | 0 | src/mock/MockRegistryV2.sol:MockRegistryV2 | 36786 B |
| ens-verifiable-factory-solx | solidity | solx-0.1.8 vs default | 3063 B | 0 | 3141 B | 0 | src/mock/MockRegistryV2.sol:MockRegistryV2 | 31087 B |
| graph-horizon-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | 27696 B | 2 | 22199 B | 0 | contracts/payments/collectors/RecurringCollector.sol:RecurringCollector | 145735 B |
| graph-horizon-solx | solidity | solx-0.1.8 vs default | 27025 B | 1 | 24007 B | 0 | contracts/payments/collectors/RecurringCollector.sol:RecurringCollector | 124000 B |
| lidofinance-core-solx | mocha | solx-0.1.8-via-ir vs solc-via-ir | 34895 B | 5 | 25993 B | 2 | contracts/0.8.25/vaults/VaultHub.sol:VaultHub | 131182 B |
| openzeppelin-contracts-0.34 | mocha | solx-0.1.8-via-ir vs solc-via-ir | 30054 B | 9 | 21506 B | 0 | contracts-exposed/contracts/mocks/governance/GovernorStorageMock.sol:$GovernorStorageMock | 48970 B |
| openzeppelin-contracts-0.34 | mocha | solx-0.1.8 vs default | 28744 B | 4 | 25277 B | 1 | contracts-exposed/contracts/utils/Packing.sol:$Packing | 41862 B |
| openzeppelin-contracts-0.34 | solidity | solx-0.1.8-via-ir vs solc-via-ir | 30054 B | 9 | 21506 B | 0 | contracts-exposed/contracts/mocks/governance/GovernorStorageMock.sol:$GovernorStorageMock | 48970 B |
| openzeppelin-contracts-0.34 | solidity | solx-0.1.8 vs default | 28744 B | 4 | 25277 B | 1 | contracts-exposed/contracts/utils/Packing.sol:$Packing | 41862 B |
| solady-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | 4953 B | 0 | 4133 B | 0 | src/utils/ext/zksync/ERC1967Factory.sol:ERC1967Factory | 105711 B |
| solady-solx | solidity | solx-0.1.8 vs default | 5059 B | 0 | 4561 B | 0 | src/accounts/Timelock.sol:Timelock | 93494 B |
| uniswap-v4-core-solx | solidity | solx-0.1.8-via-ir vs solc-via-ir | 23953 B | 0 | 24009 B | 0 | src/PoolManager.sol:PoolManager | 181973 B |
| uniswap-v4-core-solx | solidity | solx-0.1.8 vs default | 23230 B | 0 | 26947 B | 1 | src/PoolManager.sol:PoolManager | 156612 B |

## Gas snapshot check (solx measured against the control's snapshot)

Divergence data, not a verdict: two compilers are expected to differ on gas. The outcome column is the state the comparison actually reached. `inconclusive` means no comparison happened, with the reason: the control never wrote a baseline, the run measured nothing, the solx side's build or tests failed first, or the two runs measured different sets of functions. A non-zero exit code alone cannot tell those apart from a real gas difference, which is why it is not the signal here. The counts are the ones the check prints for itself (changed + added + removed); a matched row reads 0 because a fully matching check prints no differences at all.

| scenario | pair | outcome | reason | diverging measurements | gas baseline entries | cheatcode baseline files |
|---|---|---|---|--:|--:|--:|
| solady-solx | solx-0.1.8-via-ir vs solc-via-ir | inconclusive | control-tests-failed | — | — | — |
| solady-solx | solx-0.1.8 vs default | inconclusive | control-tests-failed | — | — | — |
| uniswap-v4-core-solx | solx-0.1.8-via-ir vs solc-via-ir | DIVERGED | gas-differences | 689 | 598 | 20 |
| uniswap-v4-core-solx | solx-0.1.8 vs default | DIVERGED | gas-differences | 686 | 598 | 20 |

## Build determinism (same profile compiled twice from clean)

Whether one compiler produces the same output twice. Not a repeated measurement of a pair: the test suites still ran once each. `inconclusive` means the two compiles cannot be compared, because a clean or a compile failed, or the first compile produced no artifacts — two empty builds hash equal.

| scenario | profile | artifacts | identical sizes | note |
|---|---|--:|---|---|
| uniswap-v4-core-solx | solx-0.1.8-via-ir | 139 | yes |  |
| uniswap-v4-core-solx | solx-0.1.8 | 139 | yes |  |

## Details

### 1inch-swap-vm-solx / solidity / solx-0.1.8-via-ir-vs-solc-via-ir

test-source build fails before any test runs


bytecode/artifact inventory differences:

- 167 artifact(s) the control produced and solx did not: src/SwapVM.sol:SwapVM, src/instructions/Balances.sol:Balances, src/instructions/Balances.sol:BalancesArgsBuilder, src/instructions/BaseFeeAdjuster.sol:BaseFeeAdjuster, src/instructions/BaseFeeAdjuster.sol:BaseFeeAdjusterArgsBuilder, src/instructions/Controls.sol:Controls, src/instructions/Controls.sol:ControlsArgsBuilder, src/instructions/Debug.sol:Debug, src/instructions/Decay.sol:Decay, src/instructions/Decay.sol:DecayArgsBuilder, src/instructions/Decay.sol:DecayingOffsetLib, src/instructions/DutchAuction.sol:DutchAuction, src/instructions/DutchAuction.sol:DutchAuctionArgsBuilder, src/instructions/Extruction.sol:Extruction, src/instructions/Extruction.sol:IExtruction, src/instructions/Extruction.sol:IStaticExtruction, src/instructions/Fee.sol:Fee, src/instructions/Fee.sol:FeeArgsBuilder, src/instructions/FeeExperimental.sol:FeeArgsBuilderExperimental, src/instructions/FeeExperimental.sol:FeeExperimental, and 147 more

### aave-v4-solx / solidity / solx-0.1.8-via-ir-vs-solc-via-ir

solx ran 1559 test(s) clean, but this row has NO working control (control provenance failed: no fresh build-info files found under /tmp/e2e-solx-0.1.8/aave-v4-solx (build may not have run)), so nothing here is a differential result — it establishes the test universe under solx only (compile-error pattern present in the control log despite the run reporting success — inspect solx-0.1.8-test-evaluation-evidence/logs/aave-v4-solx--solidity--solx-0.1.8-via-ir-vs-solc-via-ir.control.log)


bytecode/artifact inventory differences:

- 329 artifact(s) solx produced and the control did not: src/access/AccessManagerEnumerable.sol:AccessManagerEnumerable, src/access/interfaces/IAccessManagerEnumerable.sol:IAccessManagerEnumerable, src/dependencies/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface, src/dependencies/openzeppelin-upgradeable/AccessManagedUpgradeable.sol:AccessManagedUpgradeable, src/dependencies/openzeppelin-upgradeable/ContextUpgradeable.sol:ContextUpgradeable, src/dependencies/openzeppelin-upgradeable/ERC20Upgradeable.sol:ERC20Upgradeable, src/dependencies/openzeppelin-upgradeable/Initializable.sol:Initializable, src/dependencies/openzeppelin/AccessManaged.sol:AccessManaged, src/dependencies/openzeppelin/AccessManager.sol:AccessManager, src/dependencies/openzeppelin/Address.sol:Address, src/dependencies/openzeppelin/Arrays.sol:Arrays, src/dependencies/openzeppelin/AuthorityUtils.sol:AuthorityUtils, src/dependencies/openzeppelin/Bytes.sol:Bytes, src/dependencies/openzeppelin/Comparators.sol:Comparators, src/dependencies/openzeppelin/Context.sol:Context, src/dependencies/openzeppelin/ECDSA.sol:ECDSA, src/dependencies/openzeppelin/ERC1967Proxy.sol:ERC1967Proxy, src/dependencies/openzeppelin/ERC1967Utils.sol:ERC1967Utils, src/dependencies/openzeppelin/ERC20.sol:ERC20, src/dependencies/openzeppelin/EnumerableSet.sol:EnumerableSet, and 309 more

### solady-solx / solidity / solx-0.1.8-via-ir-vs-solc-via-ir

(contains 1 test(s) failing under BOTH compilers, excluded from the solx verdict; 1 of them fail with DIFFERENT text on the two sides)


failing under BOTH compilers (upstream/pin noise, excluded from the solx verdict):

- `BlockHashLibTest#testBlockHash(uint256,uint256,uint256,bytes32)` (DIFFERENT failure text on the two sides — inspect before calling it the same failure)
  - solx: `Stack Trace Warning: Instruction not found at PC 2`
  - control: `at BlockHashLibTest.testBlockHash (test/BlockHashLib.t.sol:45)`

### solady-solx / solidity / solx-0.1.8-vs-default

(contains 1 test(s) failing under BOTH compilers, excluded from the solx verdict; 1 of them fail with DIFFERENT text on the two sides)


failing under BOTH compilers (upstream/pin noise, excluded from the solx verdict):

- `BlockHashLibTest#testBlockHash(uint256,uint256,uint256,bytes32)` (DIFFERENT failure text on the two sides — inspect before calling it the same failure)
  - solx: `Stack Trace Warning: Instruction not found at PC 2`
  - control: `at BlockHashLibTest.testBlockHash (test/BlockHashLib.t.sol:60)`