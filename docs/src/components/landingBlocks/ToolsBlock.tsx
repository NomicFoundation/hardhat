import React, { useEffect, useState } from "react";

import Section from "../Section";
import { Tools } from "../ui/types";
import ToolsBlockStyled from "./ToolsBlock.styled";

const {
  Container,
  ButtonContainer,
  ButtonNameContainer,
  ButtonCompanyName,
  ButtonToolName,
  ButtonsContainer,
  DescriptionContainer,
  DescriptionHeaderContainer,
  DescriptionTitle,
  DescriptionMottoContainer,
  DescriptionTitleTool,
  DescriptionText,
  ToolsIconsBlock,
  IconsBlockTitle,
  DescriptionLink,
} = ToolsBlockStyled;

interface BlockProps {
  content: {
    title: string;
    companyName: string;
    infoItems: Array<{
      icon: React.MemoExoticComponent<
        (props: React.SVGProps<SVGSVGElement>) => JSX.Element
      >;
      title: string;
      value: Tools;
      mottos: string[];
      description: string;
      link: string;
    }>;
  };
}

interface ToolProps {
  content:
    | {
        icon: React.MemoExoticComponent<
          (props: React.SVGProps<SVGSVGElement>) => JSX.Element
        >;
        title: string;
        value: Tools;
        mottos: string[];
        description: string;
        link: string;
      }
    | undefined;
  companyName: string;
}

const ToolDescription = ({ content, companyName }: ToolProps) => {
  const [currentMotto, setCurrentMotto] = useState(
    (content && content.mottos[0]) || ""
  );
  const [currentMottoClassname, setCurrentMottoClassname] = useState("runner");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentMotto && content) {
        let currentIndex = content.mottos.findIndex(
          (item) => item === currentMotto
        );
        if (currentIndex + 1 === content.mottos.length) {
          currentIndex = 0;
        } else {
          currentIndex += 1;
        }
        setCurrentMotto(content.mottos[currentIndex]);
      }
    }, 2000);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line
  }, [currentMotto]);

  useEffect(() => {
    if (content) {
      setCurrentMotto(content.mottos[0]);
      switch (content.value) {
        case Tools.RUNNER: {
          setCurrentMottoClassname("runner");
          break;
        }
        case Tools.NETWORK: {
          setCurrentMottoClassname("network");
          break;
        }
        case Tools.IGNITION: {
          setCurrentMottoClassname("ignition");
          break;
        }
        case Tools.VS_CODE: {
          setCurrentMottoClassname("vscode");
          break;
        }
        default: {
          setCurrentMottoClassname("runner");
        }
      }
    }
  }, [content]);

  return content ? (
    <DescriptionContainer>
      <DescriptionHeaderContainer>
        <DescriptionTitle>
          {companyName}
          <DescriptionTitleTool>{` ${content.title}`}</DescriptionTitleTool>
        </DescriptionTitle>
        <DescriptionMottoContainer className={currentMottoClassname}>
          <span># {currentMotto}</span>
        </DescriptionMottoContainer>
      </DescriptionHeaderContainer>
      <div>
        <DescriptionText>{content.description}</DescriptionText>
        <DescriptionLink href={content.link}>Learn more </DescriptionLink>
      </div>
    </DescriptionContainer>
  ) : null;
};

const ToolsBlock = ({ content }: BlockProps) => {
  const [selectedTool, setSelectedTool] = useState(Tools.RUNNER);

  return (
    <Section>
      <Container>
        <ToolsIconsBlock>
          <IconsBlockTitle>{content.title}</IconsBlockTitle>
          <ButtonsContainer>
            {content.infoItems.map((button) => (
              <ButtonContainer
                onClick={() => setSelectedTool(button.value)}
                key={button.value}
                className={selectedTool === button.value ? "active" : ""}
              >
                <button.icon
                  className={selectedTool === button.value ? "active" : ""}
                />
                <ButtonNameContainer>
                  <ButtonCompanyName>{content.companyName}</ButtonCompanyName>
                  <br />
                  <ButtonToolName>{button.title}</ButtonToolName>
                </ButtonNameContainer>
              </ButtonContainer>
            ))}
          </ButtonsContainer>
        </ToolsIconsBlock>
        <ToolDescription
          content={content.infoItems.find(
            (item) => item.value === selectedTool
          )}
          companyName={content.companyName}
        />
      </Container>
    </Section>
  );
};

export default ToolsBlock;
