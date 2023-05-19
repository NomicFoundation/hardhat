import React from "react";
import styled from "styled-components";

export const SummaryHeader: React.FC<{
  networkName: string;
  chainId: number;
}> = ({ networkName, chainId }) => {
  return (
    <Header>
      <Title>Summary</Title>
      <div />
      <NetworkText>
        Network: {networkName} ({chainId})
      </NetworkText>
    </Header>
  );
};

const Header = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;

  p {
    font-weight: bold;
  }
`;

const Title = styled.h2`
  place-self: center;
`;

const NetworkText = styled.p`
  place-self: center;
`;
