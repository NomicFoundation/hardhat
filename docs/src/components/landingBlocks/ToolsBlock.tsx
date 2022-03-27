import React, { useState } from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import { appTheme, tm } from "../../themes";
import useWindowSize from "../../hooks/useWindowSize";
import { Tools } from "../../config";
import ToolsIcons from "../../assets/tools";

const { media, breakpoints } = appTheme;
const { RunnerIcon, IgnitionIcon, NetworkIcon, VSCodeIcon } = ToolsIcons;

const content = {
  title: "Tools",
  tools: [
    {
      name: Tools.RUNNER,
      title: "Runner",
      prefix: "Hardhat",
      Icon: RunnerIcon,
    },
    {
      name: Tools.IGNITION,
      title: "Ignition",
      prefix: "Hardhat",
      Icon: IgnitionIcon,
    },
    {
      name: Tools.NETWORK,
      title: "Network",
      prefix: "Hardhat",
      Icon: NetworkIcon,
    },
    {
      name: Tools.VS_CODE,
      title: "VS Code",
      prefix: "Hardhat",
      Icon: VSCodeIcon,
    },
  ],
};

interface Props {
  content: typeof content;
}

const Block = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  ${media.lg} {
    flex-direction: row;
  }
`;

const MobileDivider = styled.div`
  height: 32px;
  width: 100%;
  border: 1px solid ${tm(({ colors }) => colors.neutral400)};
  position: absolute;
`;

const TopDivider = styled(MobileDivider)`
  border-left: unset;
  border-bottom: unset;
`;

const BotDivider = styled(MobileDivider)`
  border-left: unset;
  border-bottom: unset;
`;

const HeroBlock = ({ content }: Props) => {
  const windowSize = useWindowSize();
  const isDesktop = breakpoints.lg <= windowSize.width;
  const [activeTool, setActiveTool] = useState<Tools>(Tools.RUNNER);

  return (
    <Section>
      <Block>
        <TopDivider />
        <BotDivider />
      </Block>
    </Section>
  );
};

export default HeroBlock;

HeroBlock.defaultProps = { content };
