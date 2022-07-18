import type { GetStaticProps, NextPage } from "next";
import { styled } from "linaria/react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import PluginsLayout from "../../../components/PluginsLayout";
import { media, tm, tmDark, tmSelectors } from "../../../themes";
import { components } from "../../../components/DocumentationLayout";
import {
  prepareMdContent,
  readMDFileFromPathOrIndex,
} from "../../../model/markdown";
import { PLUGINS_PATH } from "../../../config";

import { getPlugins, PluginsList } from "../../../model/plugins";
import { IPlugin } from "../../../model/types";
import PluginSnippet from "../../../components/PluginSnippet";

interface IPluginsPage {
  mdxSource: MDXRemoteSerializeResult;
  sortedPlugins: PluginsList;
}

const PageTitle = styled.h3`
  margin-top: 28px;
  font-size: 42px;
  font-weight: 700;
  line-height: 45px;
  letter-spacing: 0.5px;
  padding-bottom: 24px;
  border-bottom: 1px solid ${tm(({ colors }) => colors.border)};
  ${tmSelectors.dark} {
    border-bottom-color: ${tmDark(({ colors }) => colors.border)};
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-bottom-color: ${tmDark(({ colors }) => colors.border)};
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const SectionTitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 74px;
  margin-bottom: 32px;
  ${media.md} {
    align-items: center;
    flex-direction: row;
  }
`;

const SectionTitle = styled.h3`
  font-weight: 700;
  font-size: 24px;
  line-height: 1.25;
  letter-spacing: 0.5px;
  color: ${tm(({ colors }) => colors.neutral800)};
  & > a > span {
    margin-left: -24px;
    margin-right: 8px;
    opacity: 0;
    cursor: pointer;
    color: ${tm(({ colors }) => colors.accent700)};
  }
  &:hover > a > span {
    opacity: 1;
    &:hover {
      text-decoration: underline;
    }
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const SectionTitleDescription = styled.span`
  font-size: 16px;
  color: ${tm(({ colors }) => colors.neutral700)};
  margin-top: 8px;
  ${media.md} {
    padding-left: 10px;
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral700)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral700)};
    }
  }
`;

const Plugins: NextPage<IPluginsPage> = ({ mdxSource, sortedPlugins }) => {
  return (
    <PluginsLayout
      seo={{
        title: "Plugins",
        description: "Plugins",
      }}
      sidebarLayout={[]}
    >
      <div>
        <PageTitle>Plugins</PageTitle>
        {/* @ts-ignore */}
        <MDXRemote {...mdxSource} components={components} />
        <SectionTitleWrapper>
          <SectionTitle id="official-plugins">Official plugins</SectionTitle>
        </SectionTitleWrapper>
        {sortedPlugins.officialPlugins.map((plugin: IPlugin) => {
          return (
            <PluginSnippet
              key={plugin.name}
              {...plugin}
              href={`/hardhat-runner/plugins/${plugin.normalizedName || ""}`}
            />
          );
        })}

        <SectionTitleWrapper>
          <SectionTitle id="community-plugins">Community plugins</SectionTitle>
          <SectionTitleDescription>
            Sorted by npm downloads
          </SectionTitleDescription>
        </SectionTitleWrapper>
        {sortedPlugins.communityPlugins.map((plugin: IPlugin) => {
          return (
            <PluginSnippet
              key={plugin.name}
              {...plugin}
              href={`https://www.npmjs.com/package/${
                // eslint-disable-next-line
                plugin.npmPackage || plugin.name
              }`}
            />
          );
        })}
      </div>
    </PluginsLayout>
  );
};

export default Plugins;

export const getStaticProps: GetStaticProps = async () => {
  const sortedPlugins = await getPlugins();
  const { source } = readMDFileFromPathOrIndex(`${PLUGINS_PATH}/index.md`);
  const { mdxSource } = await prepareMdContent(source);

  return {
    props: {
      mdxSource,
      sortedPlugins,
    },
  };
};
