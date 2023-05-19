import { FutureType } from "@ignored/ignition-core/ui-helpers";
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { UiFuture } from "../../../types";

export const Action: React.FC<{
  future: UiFuture;
}> = ({ future }) => {
  const navigate = useNavigate();

  const displayText = toDisplayText(future);

  const navigateToFuture = useCallback(() => {
    return navigate(`/future/${future.id}`);
  }, [future.id, navigate]);

  return (
    <ActionBtn futureType={future.type} onClick={navigateToFuture}>
      <Text>{displayText}</Text>
    </ActionBtn>
  );
};

function toDisplayText(future: UiFuture): string {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      return `Contract deploy ${future.contractName}`;
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      return `Deploy contract ${future.contractName} from artifact`;
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      return `Library deploy ${future.contractName}`;
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      return `Library deploy ${future.contractName} from artifact`;
    case FutureType.NAMED_CONTRACT_CALL:
      return `Call ${future.contract.contractName}/${future.functionName}`;
    case FutureType.NAMED_STATIC_CALL:
      return `Static call ${future.contract.contractName}/${future.functionName}`;
    case FutureType.CONTRACT_AT:
      return `Existing contract ${future.contractName} (${future.address})`;
  }
}

const Text = styled.p`
  margin: 0;
`;

const ActionBtn = styled.div<{ futureType: number }>`
  border: 1px solid black;
  padding: 1rem;
  font-weight: bold;

  &:hover {
    background: blue;
    cursor: pointer;
  }

  ${(props) =>
    [
      FutureType.NAMED_CONTRACT_DEPLOYMENT,
      FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
      FutureType.NAMED_LIBRARY_DEPLOYMENT,
      FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
    ].includes(props.futureType) &&
    css`
      background: green;
      color: white;
    `}

  ${(props) =>
    [FutureType.NAMED_CONTRACT_CALL, FutureType.NAMED_STATIC_CALL].includes(
      props.futureType
    ) &&
    css`
      background: yellow;
      color: black;
    `}
`;
