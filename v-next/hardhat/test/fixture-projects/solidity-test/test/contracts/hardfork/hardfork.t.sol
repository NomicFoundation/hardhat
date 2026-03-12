// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract EIP7212Test {
  address constant P256_PRECOMPILE = address(0x100);

  function testPrecompileExistence() public view {
    // Pre-generated values
    bytes32 msgHash = 0x7547e7989971d6c63cf140647fefc5c3043460ea96763f529feef8bc83b67680;
    bytes32 r = 0x4456df631c55951140b184cc1b4db60e78f1ae4b003e336348bc7d3c1cc8daab;
    bytes32 s = 0xfd26094146960c9f1df540c823a3c44d969b48fd42da2142450772ce2d45c064;
    bytes32 x = 0x703bbc0830e0238b0030e03cff350561ae96ac5f00edc3be1c72bbc04e0f0180;
    bytes32 y = 0x958533939e7571d60f6e895709ab5d3f9f339e0a26cc8baaf61200340d8e6c90;

    bytes memory input = abi.encodePacked(msgHash, r, s, x, y);

    (, bytes memory ret) = P256_PRECOMPILE.staticcall(input);

    // CHECK 1: The precompile must exist
    // If this fails (length == 0), the precompile is missing
    require(ret.length == 32, "EIP-7212 Precompile missing: Returned 0 bytes");

    // CHECK 2: The signature must be valid
    // If the precompile exists, this should return 1
    uint256 result = abi.decode(ret, (uint256));
    require(result == 1, "Signature verification failed");
  }
}
