export interface ABIArgumentLengthError extends Error {
    code: "INVALID_ARGUMENT";
    count: {
        types: number;
        values: number;
    };
    value: {
        types: Array<{
            name: string;
            type: string;
        }>;
        values: any[];
    };
    reason: string;
}
export declare function isABIArgumentLengthError(error: any): error is ABIArgumentLengthError;
export interface ABIArgumentTypeError extends Error {
    code: "INVALID_ARGUMENT";
    argument: string;
    value: any;
    reason: string;
}
export declare function isABIArgumentTypeError(error: any): error is ABIArgumentTypeError;
export interface ABIArgumentOverflowError extends Error {
    code: "NUMERIC_FAULT";
    fault: "overflow";
    value: any;
    reason: string;
    operation: string;
}
export declare function isABIArgumentOverflowError(error: any): error is ABIArgumentOverflowError;
//# sourceMappingURL=ABITypes.d.ts.map