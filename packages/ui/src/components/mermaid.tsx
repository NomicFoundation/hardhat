import React, { useEffect, useMemo } from "react";
import styled from "styled-components";

import { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import mermaid from "mermaid";
import { toMermaid } from "../utils/to-mermaid";

export const Mermaid: React.FC<{
  deployment: StoredDeployment;
}> = ({ deployment }) => {
  const diagram = useMemo(() => toMermaid(deployment), [deployment]);

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
