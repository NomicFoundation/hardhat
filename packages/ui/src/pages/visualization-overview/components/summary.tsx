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
    [ignitionModule]
  );

  const deployCountPerContract = deployFutures.reduce((acc, future) => {
    const count = acc[future.contractName] ?? 0;
    return { ...acc, [future.contractName]: count + 1 };
  }, {} as Record<string, number>);

  return (
    <div>
      <Title>Contracts to be deployed</Title>

      <div>
        {deployFutures.length === 0 ? null : (
          <ul>
            {Object.entries(deployCountPerContract).map(
              ([contractName, count]) => (
                <ListItem key={contractName}>
                  {contractName}
                  {count > 1 ? ` x${count}` : null}
                </ListItem>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

const Title = styled.div`
  font-size: 24px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0em;

  color: #16181d;
`;

const ListItem = styled.li`
  font-size: 17px;
  font-weight: 700;
  line-height: 25px;
  letter-spacing: 0em;
  text-align: left;
`;
