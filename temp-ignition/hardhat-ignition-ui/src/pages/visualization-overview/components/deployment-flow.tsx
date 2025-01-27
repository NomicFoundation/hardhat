import {
  IgnitionModule,
  IgnitionModuleResult,
  isDeploymentFuture,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React, { useState } from "react";
import { Tooltip } from "react-tooltip";
import styled, { css } from "styled-components";
import { TooltipIcon } from "../../../assets/TooltipIcon";
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

      {futures.length <= 1 ? (
        <SingleFutureNotice>
          A module diagram will show once you have more than 1 future.
        </SingleFutureNotice>
      ) : (
        <div>
          <BatchBtnSection>
            <VisualizeDiv>Visualize batches</VisualizeDiv>
            {batches.map((_, i) => (
              <BatchBtn
                key={`batch-btn-${i}`}
                onMouseEnter={() => setCurrentlyHovered(`batch-${i}`)}
                onMouseLeave={() => setCurrentlyHovered("")}
                isCurrentlyHovered={currentlyHovered === `batch-${i}`}
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
      )}
    </div>
  );
};

const SingleFutureNotice = styled.div`
  padding-top: 1rem;
`;

const VisualizeDiv = styled.div`
  font-weight: 700;
  padding: 1.5rem;
  width: 100%;
`;

// TODO: when we added the future-to-module dependency, we created a non-ideal situation where
// a module-to-module dependency arrow still gets added to the mermaid graph, even if the dependant module
// is only used as a future-to-module dependency. This is because the dependant module has to get added to the
// parent module as a submodule, and we currently don't have a way of distinguishing at this point in the code between
// a submodule that is exclusively used as a future-to-module dependency (i.e. in { after: [...] })
// and a submodule that is used as a module-to-module dependency (i.e. in m.useModule(...)).
// This is a known issue that we have decided to revisit at a later point in time because the solution is not trivial.
const FlowTooltip: React.FC = () => (
  <span style={{ paddingLeft: "0.5rem", cursor: "pointer" }}>
    <a data-tooltip-id="flow-tooltip">
      <TooltipIcon />
    </a>
    <Tooltip className="styled-tooltip flow-tooltip" id="flow-tooltip">
      <div>Diagram reference</div>
      <span>Future to future dependency</span>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span style={{ marginLeft: "-7px", letterSpacing: "-2px" }}>
        -----------&gt;
      </span>
      <br />
      <span>Future to module dependency</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <span style={{ marginLeft: "-4px" }} className="future-to-module-arrow">
        ----&gt;
      </span>
      <br />
      <span>Module to module dependency</span>&nbsp;&nbsp;&nbsp;&nbsp;
      <span style={{ marginLeft: "-3px" }}>- - -&gt;</span>
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
            fill: #16181d !important;
          }

          g[id^="flowchart-${id}-"] span {
            color: #fbf8d8 !important;
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
  display: inline-flex;
  align-items: center;

  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const BatchBtnSection = styled.div`
  margin-bottom: 40px;
  text-align: center;
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  row-gap: 1rem;
  width: 100%;
`;

const BatchBtn = styled.span<{ isCurrentlyHovered: boolean }>`
  font-size: 0.8rem;
  width: 86px;
  text-align: center;
  padding: 0.5rem 1rem;
  margin: auto 0.5rem;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #edcf00;
  cursor: pointer;
  white-space: nowrap;

  ${(props) =>
    props.isCurrentlyHovered &&
    `
    background: #16181D;
    color: #FBF8D8;
    border: 1px solid #16181D;
  `}
`;
