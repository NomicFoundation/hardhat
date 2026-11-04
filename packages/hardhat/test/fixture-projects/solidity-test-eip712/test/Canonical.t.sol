// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Cheats.sol";
import {
  Asset,
  Batch,
  Envelope,
  Grid,
  Mail,
  Node,
  Order,
  Person,
  Receipt
} from "../contracts/Types.sol";

contract CanonicalTypesTest is Eip712Test {
  function test_emitsASingleHeadForAPrimitivesOnlyStruct() public pure {
    assertTypeHash("Person", "Person(string name,address wallet)");
  }

  function test_inlinesADependencyNamedTwiceOnlyOnce() public pure {
    assertTypeHash(
      "Mail",
      "Mail(Person from,Person to,string contents)"
      "Person(string name,address wallet)"
    );
  }

  function test_sortsDependenciesByName() public pure {
    assertTypeHash(
      "Order",
      "Order(Asset give,Asset take,Person maker)"
      "Asset(address token,uint256 amount)"
      "Person(string name,address wallet)"
    );
  }

  function test_inlinesTransitiveDependencies() public pure {
    assertTypeHash(
      "Envelope",
      "Envelope(Mail mail,uint256 nonce)"
      "Mail(Person from,Person to,string contents)"
      "Person(string name,address wallet)"
    );
  }

  function test_treatsAnArrayOfStructsAsADependency() public pure {
    assertTypeHash(
      "Batch",
      "Batch(Asset[] assets)Asset(address token,uint256 amount)"
    );
  }

  function test_keepsFixedSizeAndNestedArraySuffixes() public pure {
    assertTypeHash(
      "Grid",
      "Grid(Asset[2] pair,uint256[3][] rows)"
      "Asset(address token,uint256 amount)"
    );
  }

  function test_ignoresSelfReferences() public pure {
    assertTypeHash("Node", "Node(uint256 value,Node[] children)");
  }

  function test_encodesEnumInterfaceAndUserDefinedValueMembers() public pure {
    assertTypeHash(
      "Receipt",
      "Receipt(uint8 status,address token,uint128 amount,bytes32 digest,"
      "bytes payload,bool ok,int64 delta)"
    );
  }

  function test_hashesAStructValueAgainstItsManualEncoding() public pure {
    Asset memory asset = Asset({token: address(0xBEEF), amount: 7});

    bytes32 expected = keccak256(
      abi.encode(
        keccak256("Asset(address token,uint256 amount)"),
        asset.token,
        asset.amount
      )
    );

    require(
      vm.eip712HashStruct("Asset", abi.encode(asset)) == expected,
      "hashStruct should match the manual EIP-712 encoding"
    );
  }
}
