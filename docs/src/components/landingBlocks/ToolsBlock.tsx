import React from "react";
import { styled } from "linaria/react";
import Section from "../Section";
import { appTheme, tm } from "../../themes";
import { Tools } from "../ui/types";
import ToolsIcons from "../../assets/tools";

const { media } = appTheme;
const { RunnerIcon, IgnitionIcon, NetworkIcon, VSCodeIcon } = ToolsIcons;

const defaultContent = {
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

const ToolsBlock = () => {
  return (
    <Section>
      <Block>
        <TopDivider />
        <BotDivider />
      </Block>
    </Section>
  );
};

export default ToolsBlock;

ToolsBlock.defaultProps = { content: defaultContent };
