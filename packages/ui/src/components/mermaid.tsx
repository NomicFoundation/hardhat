import React, { useEffect, useMemo } from "react";
import styled from "styled-components";

import { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import mermaid from "mermaid";
import { toMermaid } from "../utils/to-mermaid";

export const Mermaid: React.FC<{
  deployment: StoredDeployment;
}> = ({ deployment }) => {
  const diagram = useMemo(() => {
    const d = toMermaid(deployment);

    // NOTE: this is explicitly added to aid troubleshooting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).diagram = d;

    return d;
  }, [deployment]);

  useEffect(() => {
    mermaid.initialize({});

    mermaid.contentLoaded();
  });

  return (
    <Wrap>
      <div className="mermaid">{diagram}</div>
    </Wrap>
  );
};

const Wrap = styled.div``;
