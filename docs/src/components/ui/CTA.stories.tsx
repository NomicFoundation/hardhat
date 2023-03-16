import React from "react";
import { styled } from "linaria/react";
import CTA from "./CTA";

export default {
  title: "UI components/CTA",
};

const Row = styled.div`
  display: flex;
  justify-content: flex-start;
  column-gap: 50px;

  h4 {
    margin: 50px 0 30px;
  }
`;

const onClick = () => null;

export const Buttons = () => (
  <div>
    <Row>
      <h4>Links</h4>
    </Row>
    <Row>
      <CTA href="/">Primary CTA</CTA>
      <CTA href="/" variant="full-padding">
        Primary CTA
      </CTA>
      <CTA href="/" variant="secondary">
        Secondary CTA
      </CTA>
      <CTA href="/" variant="secondary full-padding">
        Secondary CTA
      </CTA>
    </Row>
    <Row>
      <h4>Buttons</h4>
    </Row>
    <Row>
      <CTA onClick={onClick}>Primary CTA</CTA>
      <CTA onClick={onClick} variant="full-padding">
        Primary CTA
      </CTA>
      <CTA onClick={onClick} variant="secondary">
        Secondary CTA
      </CTA>
      <CTA onClick={onClick} variant="secondary full-padding">
        Secondary CTA
      </CTA>
    </Row>
  </div>
);

export const Secondary = () => (
  <CTA href="/" variant="secondary full-padding">
    secondary button
  </CTA>
);
