/**
 * The URL of a module to preload with `node --import <url>` in a child
 * process, which makes it fail as soon as anything resolves `tsx`.
 *
 * The child process must run built JavaScript, as it can't load TypeScript
 * without `tsx`.
 */
export const NO_TSX_HOOK_URL: string = import.meta.resolve("./no-tsx-hook.js");
