pragma solidity ^0.5.0;

import "./../../../../../../../console.sol";

contract C {
	address constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);

	function log() public {
    _sendLogPayload(abi.encodeWithSignature("log(uint)", 100));
    _sendLogPayload(abi.encodeWithSignature("log(uint256)", 101));
    _sendLogPayload(abi.encodeWithSignature("log(int)", 102));
    _sendLogPayload(abi.encodeWithSignature("log(int256)", 103));
    _sendLogPayload(abi.encodeWithSignature("log(uint,bool)", 104, true));
    _sendLogPayload(abi.encodeWithSignature("log(uint256,bool)", 105, true));
    _sendLogPayload(abi.encodeWithSignature("log(bool,uint)", true, 106));
    _sendLogPayload(abi.encodeWithSignature("log(bool,uint256)", true, 107));
	}

	function _sendLogPayload(bytes memory payload) private view {
		uint256 payloadLength = payload.length;
		address consoleAddress = CONSOLE_ADDRESS;
		assembly {
			let payloadStart := add(payload, 32)
			let r := staticcall(gas(), consoleAddress, payloadStart, payloadLength, 0, 0)
		}
	}
}
