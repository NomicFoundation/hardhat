import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { Artifacts } from "hardhat/types";
import { isFullyQualifiedName } from "hardhat/utils/contract-names";
import path from "path";

import { LazyTruffleContractProvisioner } from "./provisioner";
import { TruffleContract, TruffleContractInstance } from "./types";

export class TruffleEnvironmentArtifacts {
  constructor(
    private readonly _provisioner: LazyTruffleContractProvisioner,
    private readonly _artifacts: Artifacts
  ) {}

  public require(contractPath: string): any {
    const name = this._getContractNameFromPath(contractPath);

    return this._getTruffleContract(name);
  }

  public contractNeedsLinking(Contract: TruffleContract) {
    return Contract.bytecode.includes("__");
  }

  public contractWasLinked(Contract: TruffleContract) {
    try {
      const contractBinary: string = Contract.binary;
      if (contractBinary.includes("__")) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  /**
   * This functions links a contract with one or multiple libraries.
   *
   * We have this method here because our artifacts format is slightly different
   * than Truffle's and doesn't include deployment information.
   *
   * This method also makes TruffleContract work with solc 0.5.x bytecode and
   * link symbols.
   */
  public link(
    destination: TruffleContract,
    ...libraries: TruffleContractInstance[]
  ) {
    if (libraries.length === 0) {
      return;
    }

    for (const library of libraries) {
      if (
        library.address === undefined ||
        library.constructor.network_id === undefined
      ) {
        throw new NomicLabsHardhatPluginError(
          "@nomiclabs/hardhat-truffle5",
          `Error while linking library ${library._json.contractName} into contract ${destination.contractName}: library not deployed.`
        );
      }
    }

    const destinationArtifact =
      destination._hArtifact ??
      this._artifacts.readArtifactSync(destination.contractName);

    const libraryAddresses: { [libraryName: string]: string } = {};

    const linkReferences = destinationArtifact.linkReferences;

    // Explanation of the following hacks:
    //
    //    1. When compiling a contract that uses libraries solc doesn't know the addresses
    //       of those. So when emitting the contract's bytecode it uses placeholders instead
    //       of them, and outputs a linkReferences object with info about them.
    //
    //    2. solc 0.4.x based those placeholders in the filename of the library and its name.
    //
    //    3. solc 0.5.x changed that and uses something like __$<hexa string>$__
    //
    //    4. TruffleContract linking process ignores the linkReferences object and generates
    //       the placeholders from the library name and replaces that in the bytecode. This
    //       process if broken, but we need to somewhat support it.
    //
    //    5. We use the version of Contract.link that takes a map of library names to
    //       addresses to support both versions of solc.
    //
    //    6. In order to do that, we fetch the first placeholder of each library. Note that
    //       depending on the version of solc used to compile the contrat it may be based on
    //       the library name, or based on a hexa string (a hash?).
    //
    //    7. We remove some underscores and escape some chars so that TruffleContract can
    //       match the original placeholder. Internally TruffleContract uses the library name
    //       to create a regex (without escaping anything) that matches the placeholder.
    //
    //    8. We used the resulting string as contract names to create a map from library name
    //       to their addresses, and finally call Contract.link with it.
    //
    //    9. TruffleContract doesn't validate the library names, so "\\$<hexa string>\\$" is
    //       accepted as name.
    //
    for (const file of Object.keys(linkReferences)) {
      for (const contractName of Object.keys(linkReferences[file])) {
        const library = libraries.find(
          (c) => c.constructor.contractName === contractName
        );

        const linksData = linkReferences[file][contractName];

        if (library !== undefined) {
          const firstLinkData = linksData[0];

          // link data is expressed in bytes, but the bytecode is hex encoded, so we
          // need to multiply everything by 2.
          const linkPlaceholder = destinationArtifact.bytecode.substr(
            firstLinkData.start * 2 + 2, // The + 2 is because of the 0x prefix
            firstLinkData.length * 2
          );

          const libraryIdentifier = linkPlaceholder
            .slice(2)
            .replace(/_+$/, "")
            .replace(/\$/g, "\\$");

          libraryAddresses[libraryIdentifier] = library.address;
        }
      }
    }

    const arraysOfLibs = Object.values<{ [lib: string]: any }>(
      linkReferences
    ).map((v) => Object.keys(v));
    // This is just a flatten
    const libs: string[] = ([] as string[]).concat.apply([], arraysOfLibs);

    for (const lib of libraries) {
      const libName = lib.constructor.contractName;
      if (libs.length === 0) {
        throw new NomicLabsHardhatPluginError(
          "@nomiclabs/hardhat-truffle5",
          `Tried to link contract ${destination.contractName} with library ${libName}, but it uses no libraries.`
        );
      }

      if (!libs.includes(libName)) {
        throw new NomicLabsHardhatPluginError(
          "@nomiclabs/hardhat-truffle5",
          `Tried to link contract ${
            destination.contractName
          } with library ${libName}, but it's not one of its libraries. ${
            destination.contractName
          }'s libraries are: ${libs.join(", ")}`
        );
      }
    }

    // We never save the network_id's nor change them, so they are all the same.
    // We assigin one here just because TruffleContract needs one.
    destination.setNetwork(libraries[0].constructor.network_id);
    destination.link(libraryAddresses);
  }

  private _getContractNameFromPath(contractPath: string) {
    // if the given argument has a colon, we interpret it as a
    // fully qualified name and pass it verbatim to `readArtifactSync`
    if (isFullyQualifiedName(contractPath)) {
      return contractPath;
    }

    const basename = path.basename(contractPath);

    const lastDotIndex = basename.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return basename;
    }

    return basename.slice(0, lastDotIndex);
  }

  private _getTruffleContract(contractName: string): TruffleContract {
    const artifact = this._artifacts.readArtifactSync(contractName);
    const TruffleContractFactory = require("@nomiclabs/truffle-contract");
    const Contract = TruffleContractFactory(artifact);

    const truffleContract = this._provisioner.provision(Contract, this);

    // we add the artifact so that it's available when the contract is linked
    // otherwise the contract name is used to get the artifact and that could be
    // ambiguous
    truffleContract._hArtifact = artifact;

    return truffleContract;
  }
}
