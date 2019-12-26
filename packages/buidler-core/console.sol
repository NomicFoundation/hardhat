pragma solidity >=0.4.11 <0.6.0;

library console {
    function log(uint p0) internal view {
        address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
        (bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256)", p0));
        ignored;
    }

    function log(string memory p0) internal view {
        address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
        (bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string)", p0));
        ignored;
    }

    // Many more overloads

}