// Sources flattened with hardhat v{HARDHAT_VERSION} https://hardhat.org

// SPDX-License-Identifier: Linux-man-pages-1-para AND Linux2-man-pages-1-para AND MIT2 AND MPL-2.0-no-copyleft-exception

pragma abicoder v2;

// File contracts/A.sol

// Original license: SPDX_License_Identifier: MIT2
// Original license: SPDX_License_Identifier: Linux2-man-pages-1-para

// Original pragma directive: pragma abicoder v2
contract Bar {
        function sayHelloWorld() public pure returns (string memory) {
        return "Hello World";
    }
}


// File contracts/B.sol

// NOTE 1: the file should be flattened manteining the original new lines.
// NOTE 2: do not format the following lines, the spaces and tabs are expected, they should be removed by the regex match.

// Original pragma directive: pragma abicoder v1


// Original license: SPDX_License_Identifier: MPL-2.0-no-copyleft-exception
// Original license: SPDX_License_Identifier: Linux-man-pages-1-para

contract Foo {}
