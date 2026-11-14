// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";
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
  // The canonical heads the cases below share, as primary types or inlined
  // dependency bodies.
  string private constant PERSON_HEAD = "Person(string name,address wallet)";
  string private constant ASSET_HEAD = "Asset(address token,uint256 amount)";
  string private constant MAIL_HEAD =
    "Mail(Person from,Person to,string contents)";

  function test_emitsASingleHeadForAPrimitivesOnlyStruct() public pure {
    assertTypeHash("Person", PERSON_HEAD);
  }

  function test_inlinesADependencyNamedTwiceOnlyOnce() public pure {
    assertTypeHash(
      "Mail",
      string.concat(
        MAIL_HEAD,
        PERSON_HEAD
      )
    );
  }

  function test_sortsDependenciesByName() public pure {
    assertTypeHash(
      "Order",
      string.concat(
        "Order(Asset give,Asset take,Person maker)",
        ASSET_HEAD,
        PERSON_HEAD
      )
    );
  }

  function test_inlinesTransitiveDependencies() public pure {
    assertTypeHash(
      "Envelope",
      string.concat(
        "Envelope(Mail mail,uint256 nonce)",
        MAIL_HEAD,
        PERSON_HEAD
      )
    );
  }

  function test_treatsAnArrayOfStructsAsADependency() public pure {
    assertTypeHash("Batch", string.concat("Batch(Asset[] assets)", ASSET_HEAD));
  }

  function test_keepsFixedSizeAndNestedArraySuffixes() public pure {
    assertTypeHash(
      "Grid",
      string.concat("Grid(Asset[2] pair,uint256[3][] rows)", ASSET_HEAD)
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
      abi.encode(keccak256(bytes(ASSET_HEAD)), asset.token, asset.amount)
    );

    require(
      vm.eip712HashStruct("Asset", abi.encode(asset)) == expected,
      "hashStruct should match the manual EIP-712 encoding"
    );
  }
}
