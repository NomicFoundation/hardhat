// "anyValue" marker: setting up an even or error parameter to this value
// will cause emitWithArgs or revertWithCustomErrorWithArgs to ignore this parameter.
export const anyValue: string = 'ANY'

// cleanup received args:
// any expected argument with "anyValue" is copied over to the receivedArg,
// so that the two objects can be cmopared with "deepEqual".
export function cleanupAnyValue (expectedArgs: any, receivedArgs: any): void {

  expectedArgs.forEach((arg: any, index: number) => {
    if (arg === anyValue) {
      receivedArgs[index] = anyValue
    }
  })
}

