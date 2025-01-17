import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import svgPanZoom from "svg-pan-zoom";

import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import mermaid from "mermaid";

import { toMermaid } from "../utils/to-mermaid";

export const Mermaid: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  const diagram = useMemo(() => {
    const d = toMermaid(ignitionModule);

    // NOTE: this is explicitly added to aid troubleshooting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).diagram = d;

    return d;
  }, [ignitionModule]);

  useEffect(() => {
    mermaid.initialize({
      maxTextSize: 5000000,
      flowchart: {
        padding: 50,
      },
    });

    mermaid.contentLoaded();
  });

  // requestAnimationFrame is used to ensure that the svgPanZoom is called after the svg is rendered
  useEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        svgPanZoom(".mermaid > svg", {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
        });
      }, 0);
    });
  });

  return (
    <Wrap>
      <div className="mermaid">{diagram}</div>
    </Wrap>
  );
};

const Wrap = styled.div``;
