import React from "react";
import styled from "styled-components";

export const SummaryHeader: React.FC = () => {
  return (
    <Header>
      <Title>Summary</Title>
      <div />
    </Header>
  );
};

const Header = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;

  p {
    font-weight: bold;
  }
`;

const Title = styled.h2`
  place-self: center;
`;
