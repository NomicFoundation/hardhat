import "../../../types/hooks.js";
declare module "../../../types/hooks.js" {
  export interface HardhatHooks {
    clean: CleanHooks;
  }

  export interface CleanHooks {
    onClean: (context: HookContext) => Promise<void>;
  }
}
