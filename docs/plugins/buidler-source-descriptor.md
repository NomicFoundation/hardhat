---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/kendricktan/buidler-source-descriptor/tree/master)
:::

# buidler-source-descriptor

# Quickstart

```shell
npm install buidler-source-descriptor
```

Add this to your `buidler.config.js`:

```javascript
const { usePlugin } = require("@nomiclabs/buidler/config");

usePlugin("buidler-source-descriptor");

module.exports = {
  // All fields are optional,
  // path defaults to cache path
  // file defaults to ast-doc.json
  // ignores nothing by default
  astdocs: {
    path: "./ast-docs",
    file: "ast-doc.json",
    ignores: "test"
  }
  // ...
};
```

```shell
npx buidler compile
```

# What does it do

Parses the AST to generate (richer) documentation.

Data is serialized in a JSON blob, e.g.

```json
{
  "contracts/Child.sol": {
    "imports": ["contracts/Parent.sol"],
    "contracts": {
      "Child": {
        "functions": [
          {
            "name": "myFunction",
            "signature": "myFunction() external",
            "returns": "()",
            "events": ["OwnerNominated"],
            "modifiers": ["onlyOwner"],
            "visibility": "external",
            "lineNumber": 6
          }
        ],
        "events": [],
        "variables": [],
        "modifiers": [],
        "structs": [],
        "inherits": ["Parent"]
      }
    }
  },
  "contracts/ERC20.sol": {
    "imports": ["contracts/IERC20.sol"],
    "contracts": {
      "SafeMath": {
        "functions": [
          {
            "name": "add",
            "signature": "add(uint256 a, uint256 b) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 8
          },
          {
            "name": "sub",
            "signature": "sub(uint256 a, uint256 b) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 15
          },
          {
            "name": "sub",
            "signature": "sub(uint256 a, uint256 b, string errorMessage) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 19
          },
          {
            "name": "mul",
            "signature": "mul(uint256 a, uint256 b) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 30
          },
          {
            "name": "div",
            "signature": "div(uint256 a, uint256 b) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 44
          },
          {
            "name": "div",
            "signature": "div(uint256 a, uint256 b, string errorMessage) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 48
          },
          {
            "name": "mod",
            "signature": "mod(uint256 a, uint256 b) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 60
          },
          {
            "name": "mod",
            "signature": "mod(uint256 a, uint256 b, string errorMessage) internal",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 64
          }
        ],
        "events": [],
        "modifiers": [],
        "structs": [],
        "inherits": []
      },
      "ERC20": {
        "functions": [
          {
            "name": "totalSupply",
            "signature": "totalSupply() public",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 96
          },
          {
            "name": "balanceOf",
            "signature": "balanceOf(address account) public",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 103
          },
          {
            "name": "transfer",
            "signature": "transfer(address recipient, uint256 amount) public",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 115
          },
          {
            "name": "allowance",
            "signature": "allowance(address owner, address spender) public",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 123
          },
          {
            "name": "approve",
            "signature": "approve(address spender, uint256 amount) public",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 138
          },
          {
            "name": "transferFrom",
            "signature": "transferFrom(address sender, address recipient, uint256 amount) public",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 155
          },
          {
            "name": "increaseAllowance",
            "signature": "increaseAllowance(address spender, uint256 addedValue) public",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 183
          },
          {
            "name": "decreaseAllowance",
            "signature": "decreaseAllowance(address spender, uint256 subtractedValue) public",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 209
          },
          {
            "name": "_transfer",
            "signature": "_transfer(address sender, address recipient, uint256 amount) internal",
            "returns": "()",
            "events": ["Transfer"],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 238
          },
          {
            "name": "_mint",
            "signature": "_mint(address account, uint256 amount) internal",
            "returns": "()",
            "events": ["Transfer"],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 261
          },
          {
            "name": "_burn",
            "signature": "_burn(address account, uint256 amount) internal",
            "returns": "()",
            "events": ["Transfer"],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 280
          },
          {
            "name": "_approve",
            "signature": "_approve(address owner, address spender, uint256 amount) internal",
            "returns": "()",
            "events": ["Approval"],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 304
          },
          {
            "name": "_burnFrom",
            "signature": "_burnFrom(address account, uint256 amount) internal",
            "returns": "()",
            "events": [],
            "modifiers": [],
            "visibility": "internal",
            "lineNumber": 318
          }
        ],
        "events": [],
        "variables": [
          {
            "name": "_balances",
            "type": "mapping(address => uint256)",
            "lineNumber": 87,
            "visibility": "private"
          },
          {
            "name": "_allowances",
            "type": "mapping(address => mapping(address => uint256))",
            "lineNumber": 89,
            "visibility": "private"
          },
          {
            "name": "_totalSupply",
            "type": "uint256",
            "lineNumber": 91,
            "visibility": "private"
          }
        ],
        "modifiers": [],
        "structs": [],
        "inherits": ["IERC20"]
      }
    }
  },
  "contracts/IERC20.sol": {
    "imports": [],
    "contracts": {
      "IERC20": {
        "functions": [
          {
            "name": "totalSupply",
            "signature": "totalSupply() external",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 5
          },
          {
            "name": "balanceOf",
            "signature": "balanceOf(address account) external",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 10
          },
          {
            "name": "transfer",
            "signature": "transfer(address recipient, uint256 amount) external",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 19
          },
          {
            "name": "allowance",
            "signature": "allowance(address owner, address spender) external",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 30
          },
          {
            "name": "approve",
            "signature": "approve(address spender, uint256 amount) external",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 49
          },
          {
            "name": "transferFrom",
            "signature": "transferFrom(address sender, address recipient, uint256 amount) external",
            "returns": "(bool)",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 60
          }
        ],
        "events": [
          {
            "name": "Transfer",
            "parameters": "(address from, address to, uint256 value)",
            "lineNumber": 70
          },
          {
            "name": "Approval",
            "parameters": "(address owner, address spender, uint256 value)",
            "lineNumber": 76
          }
        ],
        "variables": [],
        "modifiers": [],
        "structs": [],
        "inherits": []
      }
    }
  },
  "contracts/Multiple.sol": {
    "imports": [],
    "contracts": {
      "One": {
        "functions": [
          {
            "name": "functionOne",
            "signature": "functionOne() public",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 5
          }
        ],
        "events": [],
        "variables": [],
        "modifiers": [],
        "structs": [],
        "inherits": []
      },
      "Two": {
        "functions": [
          {
            "name": "functionTwo",
            "signature": "functionTwo() public",
            "returns": "(uint256)",
            "events": [],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 12
          }
        ],
        "events": [],
        "variables": [],
        "modifiers": [],
        "structs": [],
        "inherits": []
      }
    }
  },
  "contracts/Parent.sol": {
    "imports": [],
    "contracts": {
      "Parent": {
        "functions": [
          {
            "name": "fallback",
            "signature": "() external",
            "returns": "()",
            "events": [],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 16
          },
          {
            "name": "constructor",
            "signature": "(address _owner) public",
            "returns": "()",
            "events": ["OwnerChanged"],
            "modifiers": [],
            "visibility": "public",
            "lineNumber": 18
          },
          {
            "name": "nominateNewOwner",
            "signature": "nominateNewOwner(address _owner) external",
            "returns": "()",
            "events": ["OwnerNominated"],
            "modifiers": ["onlyOwner"],
            "visibility": "external",
            "lineNumber": 24
          },
          {
            "name": "acceptOwnership",
            "signature": "acceptOwnership() external",
            "returns": "()",
            "events": ["OwnerChanged"],
            "modifiers": [],
            "visibility": "external",
            "lineNumber": 29
          }
        ],
        "events": [
          {
            "name": "OwnerNominated",
            "parameters": "(address newOwner)",
            "lineNumber": 55
          },
          {
            "name": "OwnerChanged",
            "parameters": "(address oldOwner, address newOwner)",
            "lineNumber": 56
          }
        ],
        "variables": [
          {
            "name": "owner",
            "type": "address",
            "lineNumber": 8,
            "visibility": "public"
          },
          {
            "name": "nominatedOwner",
            "type": "address",
            "lineNumber": 9,
            "visibility": "public"
          }
        ],
        "modifiers": [
          {
            "name": "onlyOwner",
            "parameters": "()",
            "visibility": "internal",
            "lineNumber": 39
          },
          {
            "name": "onlySpecificAddress",
            "parameters": "(address user)",
            "visibility": "internal",
            "lineNumber": 47
          }
        ],
        "structs": [
          {
            "name": "MyCustomStruct",
            "members": [
              {
                "name": "aVariable",
                "type": "uint256"
              },
              {
                "name": "bVarible",
                "type": "address"
              }
            ],
            "lineNumber": 11
          }
        ],
        "inherits": []
      }
    }
  }
}
```
