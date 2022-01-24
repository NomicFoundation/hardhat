"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLibraryLinks = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("../constants");
async function getLibraryLinks(contractInformation, libraries) {
    const allLibraries = getLibraryNames(contractInformation.contract.evm.bytecode.linkReferences);
    const detectableLibraries = getLibraryNames(contractInformation.contract.evm.deployedBytecode.linkReferences);
    const undetectableLibraries = allLibraries.filter((lib) => !detectableLibraries.some((detectableLib) => {
        return (detectableLib.sourceName === lib.sourceName &&
            detectableLib.libName === lib.libName);
    }));
    // Resolve and normalize library links given by user
    const normalizedLibraries = await normalizeLibraries(allLibraries, detectableLibraries, undetectableLibraries, libraries, contractInformation.contractName);
    // Merge library links
    const mergedLibraryLinks = mergeLibraries(normalizedLibraries, contractInformation.libraryLinks);
    const mergedLibraries = getLibraryNames(mergedLibraryLinks);
    if (mergedLibraries.length < allLibraries.length) {
        // TODO: update message to help solve this problem
        const missingLibraries = allLibraries.filter((lib) => !mergedLibraries.some((mergedLib) => {
            return (lib.sourceName === mergedLib.sourceName &&
                lib.libName === mergedLib.libName);
        }));
        const missingLibraryNames = missingLibraries
            .map(({ sourceName, libName }) => `${sourceName}:${libName}`)
            .map((x) => `  * ${x}`)
            .join("\n");
        let message = `The contract ${contractInformation.sourceName}:${contractInformation.contractName} has one or more library addresses that cannot be detected from deployed bytecode.
This can occur if the library is only called in the contract constructor. The missing libraries are:
${missingLibraryNames}`;
        // We want to distinguish the case when no undetectable libraries were provided to give a more helpful message.
        if (missingLibraries.length === undetectableLibraries.length) {
            message += `

Visit https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#libraries-with-undetectable-addresses to learn how to solve this.`;
        }
        else {
            message += `

To solve this, you can add them to your --libraries dictionary with their corresponding addresses.`;
        }
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message);
    }
    return { libraryLinks: mergedLibraryLinks, undetectableLibraries };
}
exports.getLibraryLinks = getLibraryLinks;
function mergeLibraries(normalizedLibraries, detectedLibraries) {
    const conflicts = [];
    for (const [sourceName, libraries] of Object.entries(normalizedLibraries)) {
        for (const [libName, libAddress] of Object.entries(libraries)) {
            if (sourceName in detectedLibraries &&
                libName in detectedLibraries[sourceName]) {
                const detectedAddress = detectedLibraries[sourceName][libName];
                // Our detection logic encodes bytes into lowercase hex.
                if (libAddress.toLowerCase() !== detectedAddress) {
                    conflicts.push({
                        library: `${sourceName}:${libName}`,
                        detectedAddress,
                        inputAddress: libAddress,
                    });
                }
            }
        }
    }
    if (conflicts.length > 0) {
        const conflictDescriptions = conflicts
            .map((conflict) => `  * ${conflict.library}
    given address: ${conflict.inputAddress}
    detected address: ${conflict.detectedAddress}`)
            .join("\n");
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The following detected library addresses are different from the ones provided:
${conflictDescriptions}

You can either fix these addresses in your libraries dictionary or simply remove them to let the plugin autodetect them.`);
    }
    const mergedLibraries = {};
    addLibraries(mergedLibraries, normalizedLibraries);
    addLibraries(mergedLibraries, detectedLibraries);
    return mergedLibraries;
}
function addLibraries(targetLibraries, newLibraries) {
    for (const [sourceName, libraries] of Object.entries(newLibraries)) {
        if (targetLibraries[sourceName] === undefined) {
            targetLibraries[sourceName] = {};
        }
        for (const [libName, libAddress] of Object.entries(libraries)) {
            targetLibraries[sourceName][libName] = libAddress;
        }
    }
}
async function normalizeLibraries(allLibraries, detectableLibraries, undetectableLibraries, libraries, contractName) {
    const { isAddress } = await Promise.resolve().then(() => __importStar(require("@ethersproject/address")));
    const libraryFQNs = new Set();
    const normalizedLibraries = {};
    for (const [linkedLibraryName, linkedLibraryAddress] of Object.entries(libraries)) {
        if (!isAddress(linkedLibraryAddress)) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `You gave a link for the contract ${contractName} with the library ${linkedLibraryName}, but provided this invalid address: ${linkedLibraryAddress}`);
        }
        const neededLibrary = lookupLibrary(allLibraries, detectableLibraries, undetectableLibraries, linkedLibraryName, contractName);
        const neededLibraryFQN = `${neededLibrary.sourceName}:${neededLibrary.libName}`;
        // The only way for this library to be already mapped is
        // for it to be given twice in the libraries user input:
        // once as a library name and another as a fully qualified library name.
        if (libraryFQNs.has(neededLibraryFQN)) {
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The library names ${neededLibrary.libName} and ${neededLibraryFQN} refer to the same library and were given as two entries in the libraries dictionary.
Remove one of them and review your libraries dictionary before proceeding.`);
        }
        libraryFQNs.add(neededLibraryFQN);
        if (normalizedLibraries[neededLibrary.sourceName] === undefined) {
            normalizedLibraries[neededLibrary.sourceName] = {};
        }
        normalizedLibraries[neededLibrary.sourceName][neededLibrary.libName] =
            linkedLibraryAddress;
    }
    return normalizedLibraries;
}
function lookupLibrary(allLibraries, detectableLibraries, undetectableLibraries, linkedLibraryName, contractName) {
    const matchingLibraries = allLibraries.filter((lib) => {
        return (lib.libName === linkedLibraryName ||
            `${lib.sourceName}:${lib.libName}` === linkedLibraryName);
    });
    if (matchingLibraries.length === 0) {
        let detailedMessage = "";
        if (allLibraries.length > 0) {
            const undetectableLibraryFQNames = undetectableLibraries
                .map((lib) => `${lib.sourceName}:${lib.libName}`)
                .map((x) => `  * ${x}`)
                .join("\n");
            const detectableLibraryFQNames = detectableLibraries
                .map((lib) => `${lib.sourceName}:${lib.libName}`)
                .map((x) => `  * ${x} (optional)`)
                .join("\n");
            detailedMessage += `This contract uses the following external libraries:
${undetectableLibraryFQNames}
${detectableLibraryFQNames}`;
            if (detectableLibraries.length > 0) {
                detailedMessage += `
Libraries marked as optional don't need to be specified since their addresses are autodetected by the plugin.`;
            }
        }
        else {
            detailedMessage += "This contract doesn't use any external libraries.";
        }
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `You gave an address for the library ${linkedLibraryName} in the libraries dictionary, which is not one of the libraries of contract ${contractName}.
${detailedMessage}`);
    }
    if (matchingLibraries.length > 1) {
        const matchingLibrariesFQNs = matchingLibraries
            .map(({ sourceName, libName }) => `${sourceName}:${libName}`)
            .map((x) => `  * ${x}`)
            .join("\n");
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The library name ${linkedLibraryName} is ambiguous for the contract ${contractName}.
It may resolve to one of the following libraries:
${matchingLibrariesFQNs}

To fix this, choose one of these fully qualified library names and replace it in your libraries dictionary.`);
    }
    const [neededLibrary] = matchingLibraries;
    return neededLibrary;
}
function getLibraryNames(libraries) {
    const libraryNames = [];
    for (const [sourceName, sourceLibraries] of Object.entries(libraries)) {
        for (const libName of Object.keys(sourceLibraries)) {
            libraryNames.push({ sourceName, libName });
        }
    }
    return libraryNames;
}
//# sourceMappingURL=libraries.js.map