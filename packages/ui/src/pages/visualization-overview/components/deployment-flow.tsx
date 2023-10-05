import {
  IgnitionModule,
  IgnitionModuleResult,
  isDeploymentFuture,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React, { useState } from "react";
import { Tooltip } from "react-tooltip";
import styled, { css } from "styled-components";
import { Mermaid } from "../../../components/mermaid";
import { getAllFuturesForModule } from "../../../queries/futures";
import { toEscapedId } from "../../../utils/to-escaped-id";

export const DeploymentFlow: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  batches: string[][];
}> = ({ ignitionModule, batches }) => {
  /* batch highlighting logic */
  const escapedIdMap = batches.reduce((acc, batch, i) => {
    const batchId = `batch-${i}`;

    const escapedFutureIds = batch.map(toEscapedId);

    return {
      ...acc,
      [batchId]: escapedFutureIds,
    };
  }, {} as Record<string, string[]>);

  const [currentlyHovered, setCurrentlyHovered] = useState("");

  const futuresToHighlight = escapedIdMap[currentlyHovered] || [];

  /* basic future node styling */

  const futures = getAllFuturesForModule(ignitionModule);
  const deploys: string[] = [];
  const others: string[] = [];
  futures.forEach((future) => {
    if (isDeploymentFuture(future)) {
      deploys.push(toEscapedId(future.id));
    } else {
      others.push(toEscapedId(future.id));
    }
  });

  return (
    <div>
      <SectionHeader>
        Deployment flow <FlowTooltip />
      </SectionHeader>

      <BatchBtnSection>
        Visualize batches:{" "}
        {batches.map((_, i) => (
          <BatchBtn
            key={`batch-btn-${i}`}
            onMouseEnter={() => setCurrentlyHovered(`batch-${i}`)}
            onMouseLeave={() => setCurrentlyHovered("")}
          >
            Batch <strong>#{i + 1}</strong>
          </BatchBtn>
        ))}
      </BatchBtnSection>

      <HighlightedFutures
        futures={futuresToHighlight}
        deploys={deploys}
        others={others}
      >
        <Mermaid ignitionModule={ignitionModule} />
      </HighlightedFutures>
    </div>
  );
};

const FlowTooltip: React.FC = () => (
  <span style={{ fontSize: "1.25rem" }}>
    <a data-tooltip-id="flow-tooltip">ℹ️</a>
    <Tooltip className="styled-tooltip flow-tooltip" id="flow-tooltip">
      <div>Diagram reference</div>
      <br />
      <span style={{ fontWeight: 400 }}>Future to future dependency</span>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span>---&gt;</span>
      <br />
      <span>Module to module dependency</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span>- - -&gt;</span>
    </Tooltip>
  </span>
);

const HighlightedFutures = styled.div<{
  futures: string[];
  deploys: string[];
  others: string[];
}>`
  ${({ deploys }) =>
    deploys.map(
      (id) =>
        css`
          g[id^="flowchart-${id}-"] rect {
            fill: #fbf8d8 !important;
          }
        `
    )}

  ${({ others }) =>
    others.map(
      (id) =>
        css`
          g[id^="flowchart-${id}-"] rect {
            fill: #f8f2ff !important;
          }
        `
    )}

  ${({ futures }) =>
    futures.map(
      (id) =>
        css`
          g[id^="flowchart-${id}-"] rect {
            fill: #fff100 !important;
          }
        `
    )}
`;

const SectionHeader = styled.div`
  font-size: 28px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0em;
  text-align: left;

  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const BatchBtnSection = styled.div`
  margin-bottom: 40px;
`;

const BatchBtn = styled.span`
  font-size: 0.8rem;
  background: #f2efef;
  width: 86px;
  text-align: center;
  padding: 0.3rem 1rem;
  margin: auto 0.5rem;
`;
