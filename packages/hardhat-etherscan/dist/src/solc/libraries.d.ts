import { ContractInformation, ResolvedLinks } from "./bytecode";
export interface Libraries {
    [libraryName: string]: string;
}
export declare type LibraryNames = Array<{
    sourceName: string;
    libName: string;
}>;
export declare function getLibraryLinks(contractInformation: ContractInformation, libraries: Libraries): Promise<{
    libraryLinks: ResolvedLinks;
    undetectableLibraries: LibraryNames;
}>;
//# sourceMappingURL=libraries.d.ts.map