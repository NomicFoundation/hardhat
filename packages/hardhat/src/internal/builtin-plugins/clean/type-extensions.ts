declare module "../../../types/hooks.js" {
  export interface HardhatHooks {
    clean: CleanHooks;
  }

  export interface CleanHooks {
    onClean: (context: HookContext) => Promise<void>;
  }
}
