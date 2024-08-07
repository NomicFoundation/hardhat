import debugLib from "debug";

/**
 * A simple decorator that adds debug logging for when a method is entered and exited.
 *
 * This decorator is meant to be used for debugging purposes only. It should not be committed in runtime code.
 *
 * Example usage:
 *
 * ```
 * class MyClass {
 *   @withDebugLogs("MyClass:exampleClassMethod")
 *   public function exampleClassMethod(...)
 * }
 * ```
 */
export function withDebugLogs<This, Args extends any[], Return>(
  tag: string = "",
) {
  return function actualDecorator(
    originalMethod: (this: This, ...args: Args) => Return,
    _context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Return
    >,
  ): (this: This, ...args: Args) => Return {
    const log = debugLib(`hardhat:dev:core${tag === "" ? "" : `:${tag}`}`);

    function replacementMethod(this: This, ...args: Args): Return {
      log(`Entering method with args:`, args);
      const result = originalMethod.call(this, ...args);
      log(`Exiting method.`);
      return result;
    }

    return replacementMethod;
  };
}
