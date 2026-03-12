import {
  IgnitionModule,
  IgnitionModuleResult,
} from "@nomicfoundation/ignition-core/ui-helpers";
import React, { useMemo } from "react";
import styled from "styled-components";
import { getAllDeployFuturesFor } from "../../../queries/futures";

export const Summary: React.FC<{
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
}> = ({ ignitionModule }) => {
  const deployFutures = useMemo(
    () => getAllDeployFuturesFor(ignitionModule),
    [ignitionModule],
  );

  const deployCountPerContract = deployFutures.reduce(
    (acc, future) => {
      const count = acc[future.contractName] ?? 0;
      return { ...acc, [future.contractName]: count + 1 };
    },
    {} as Record<string, number>,
  );

  return (
    <SummaryStyle>
      <Title>Contracts to be deployed</Title>

      <div>
        {deployFutures.length === 0 ? null : (
          <StyledList>
            {Object.entries(deployCountPerContract).map(
              ([contractName, count]) => (
                <ListItem key={contractName}>
                  {contractName}
                  {count > 1 ? ` x${count}` : null}
                </ListItem>
              ),
            )}
          </StyledList>
        )}
      </div>
    </SummaryStyle>
  );
};

const SummaryStyle = styled.div``;

const Title = styled.div`
  font-size: 24px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0em;

  color: #16181d;
`;

const StyledList = styled.ul`
  padding-inline-start: 1rem;
`;

const ListItem = styled.li`
  font-size: 17px;
  line-height: 1.6rem;
  text-align: left;
  color: #040405;
`;
