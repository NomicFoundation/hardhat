import { ModuleParams, IgnitionError } from "@ignored/ignition-core";
import {
  DeployState,
  UpdateUiAction,
} from "@ignored/ignition-core/soon-to-be-removed";
import { render } from "ink";

import { IgnitionUi } from "./components";

interface RenderState {
  rerender: null | ((node: React.ReactNode) => void);
  unmount: null | (() => void);
  waitUntilExit: null | (() => Promise<void>);
  clear: null | (() => void);
}

export function initializeRenderState(): RenderState {
  return {
    rerender: null,
    unmount: null,
    waitUntilExit: null,
    clear: null,
  };
}

export function renderToCli(
  renderState: RenderState,
  moduleParams?: ModuleParams
): UpdateUiAction {
  return (state: DeployState) => {
    if (renderState.rerender === null) {
      const { rerender, unmount, waitUntilExit, clear } = render(
        <IgnitionUi deployState={state} moduleParams={moduleParams} />,
        { patchConsole: false }
      );

      renderState.rerender = rerender;
      renderState.unmount = unmount;
      renderState.waitUntilExit = waitUntilExit;
      renderState.clear = clear;

      return;
    }

    renderState.rerender(
      <IgnitionUi deployState={state} moduleParams={moduleParams} />
    );
  };
}

export function unmountCli(state: RenderState): Promise<void> {
  if (
    state.unmount === null ||
    state.waitUntilExit === null ||
    state.clear === null
  ) {
    throw new IgnitionError("Cannot unmount with no unmount function");
  }

  state.clear();
  state.unmount();

  return state.waitUntilExit();
}
