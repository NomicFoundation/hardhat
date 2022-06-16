import type { GetStaticProps, NextPage } from "next";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import PluginsLayout from "../../components/PluginsLayout";
import { components } from "../../components/DocumentationLayout";
import {
  prepareMdContent,
  readMDFileFromPathOrIndex,
} from "../../model/markdown";
import { DOCS_LANDING_PATH } from "../../config";

interface IDocsPage {
  mdxSource: MDXRemoteSerializeResult;
}

const Docs: NextPage<IDocsPage> = ({ mdxSource }) => {
  return (
    <PluginsLayout
      seo={{
        title: "Hardhat Documentation",
        description: "Documentation of all the Hardhat projects",
      }}
      sidebarLayout={[]}
    >
      <div>
        {/* @ts-ignore */}
        <MDXRemote {...mdxSource} components={components} />
      </div>
    </PluginsLayout>
  );
};

export default Docs;

export const getStaticProps: GetStaticProps = async () => {
  const { source } = readMDFileFromPathOrIndex(`${DOCS_LANDING_PATH}/index.md`);
  const { mdxSource } = await prepareMdContent(source);

  return {
    props: {
      mdxSource,
    },
  };
};
