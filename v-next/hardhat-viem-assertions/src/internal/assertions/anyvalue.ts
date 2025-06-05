// "anyValue" marker: setting up an event or error parameter to this value,
// will cause emitWithArgs or revertWithCustomErrorWithArgs to ignore this parameter.
export const anyValue: string = 'ANY'

// cleanup received args:
// any expected argument with "anyValue" is copied over to the receivedArg,
// so that the two objects can be compared with "deepEqual".
export function cleanupAnyValueArg(receivedArgs: any[], expectedArgs: any[]): any[] {
    return receivedArgs.map((_, index) => 
        expectedArgs[index] === anyValue ? anyValue : receivedArgs[index]);
}

