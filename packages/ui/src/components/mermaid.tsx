import React, { useEffect, useMemo } from "react";
import styled from "styled-components";

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
      flowchart: {
        padding: 50,
      },
    });

    mermaid.contentLoaded();
  });

  return (
    <Wrap>
      <div className="mermaid">{diagram}</div>
    </Wrap>
  );
};

const Wrap = styled.div``;
