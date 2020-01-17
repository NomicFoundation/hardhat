const fs = require('fs');
const eutil = require('ethereumjs-util');

const singleTypes = [];
singleTypes[0] = "int";
singleTypes[1] = "uint";
singleTypes[2] = "string memory";
singleTypes[3] = "bool";
singleTypes[4] = "address";
singleTypes[5] = "bytes memory";
singleTypes[6] = "byte";

const offset = singleTypes.length - 1;
for (let i = 1; i <= 32; i++) {
  singleTypes[offset + i] = "bytes" + i.toString()
}

const types = [];
types[0] = "uint";
types[1] = "string memory";
types[2] = "bool";
types[3] = "address";

let code = "pragma solidity ^0.5.0;" +
  "\n" +
  "\n" +
  "library console {" +
  "\n" +
    "\taddress constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);" +
  "\n" +
  "\n";

const functionPrefix = 
    "\tfunction";
const functionBody = ") internal view {" +
      "\n\t\t(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature(\"log(";
const functionSuffix = "));" +
      "\n\t\tignored;" +
    "\n\t}" +
  "\n" +
  "\n";

const keys = [];
for (let i = 0; i < singleTypes.length; i++) {
  const type = singleTypes[i].replace(" memory", "");
  const nameSuffix = type.charAt(0).toUpperCase() + type.slice(1);
  
  const sigInt = eutil.bufferToInt(eutil.keccak256("log" + "(" + type + ")").slice(0, 4));
  keys.push("consoleLogs[" + sigInt + "] = [" + type.charAt(0).toUpperCase() + type.slice(1) + "Ty];\n");
  
  code +=
    functionPrefix + " log" + nameSuffix + 
    "(" + singleTypes[i] + " p0"+
    functionBody +
    type + ')", ' +
    "p0" +
    functionSuffix
}

const maxNumberOfParameters = 4;
const numberOfPermutations = {};
const dividers = {};
const paramsNames = {};

for (let i = 0; i < maxNumberOfParameters; i++) {
  dividers[i] = Math.pow(maxNumberOfParameters, i);
  numberOfPermutations[i] = Math.pow(maxNumberOfParameters, i + 1);

  paramsNames[i] = [];
  for (let j = 0; j <= i; j++) {
    paramsNames[i][j] = "p" + j.toString()
  }
}

for (let i = 0; i < maxNumberOfParameters; i++) {
  for (let j = 0; j < numberOfPermutations[i]; j++) {
    const params = [];

    for (let k = 0; k <= i; k++) {
      params.push(types[Math.floor(j / dividers[k]) % Object.keys(types).length])
    }
    params.reverse();

    let sigParams = [];
    let constParams = [];
    
    let input = "";
    let internalParamsNames = [];
    for (let k = 0; k <= i; k++) {
      input += params[k] + " " + paramsNames[i][k] + ", ";
      internalParamsNames.push(paramsNames[i][k]);
      
      let param = params[k].replace(" memory", ""); 
      sigParams.push(param);
      constParams.push(param.charAt(0).toUpperCase() + param.slice(1) + "Ty")
    }

    if (sigParams.length !== 1) {
      const sigInt = eutil.bufferToInt(eutil.keccak256("log(" + sigParams.join(",") + ")").slice(0, 4));
      keys.push("consoleLogs[" + sigInt + "] = [" + constParams.join(", ") + "];\n");
    }

    code +=
      functionPrefix + ' log(' +
      input.substr(0, input.length - 2) +
      functionBody +
      sigParams.join(",") + ')", ' +
      internalParamsNames.join(", ") +
      functionSuffix
  }
}

code += "}\n";

console.log(...keys);
fs.writeFileSync("../console.sol", code);
