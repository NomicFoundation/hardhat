import type { NextPage, GetStaticProps, GetStaticPaths } from "next";
import { MDXRemote } from "next-mdx-remote";
import {
  getCommitDate,
  getEditLink,
  getLayout,
  getMDPaths,
  prepareMdContent,
  readMDFileFromPathOrIndex,
  withIndexFile,
} from "../model/markdown";
import Title from "../components/mdxComponents/Title";
import Paragraph from "../components/mdxComponents/Paragraph";
import CodeBlocks from "../components/mdxComponents/CodeBlocks";
import Admonition from "../components/mdxComponents/Admonition";
import DocumentationLayout from "../components/DocumentationLayout";
import { createLayouts } from "../model/layout";
import { IDocumentationSidebarStructure } from "../components/types";
import UnorderedList from "../components/mdxComponents/UnorderedList";
import HorizontalRule from "../components/mdxComponents/HorizontalRule";
import MDLink from "../components/mdxComponents/MDLink";
import Table from "../components/mdxComponents/Table";
import MDImage from "../components/mdxComponents/MDImage";
import OrderedList from "../components/mdxComponents/OrderedList";

const components = {
  h1: Title.H1,
  h2: Title.H2,
  h3: Title.H3,
  h4: Title.H4,
  h5: Title.H5,
  p: Paragraph,
  code: CodeBlocks.Code,
  pre: CodeBlocks.Pre,
  tip: Admonition.Tip,
  warning: Admonition.Warning,
  ul: UnorderedList,
  ol: OrderedList,
  hr: HorizontalRule,
  a: MDLink,
  table: Table,
  img: MDImage,
};

interface IFrontMatter {
  seoTitle: string;
  seoDescription: string;
}

interface IFooterNavigation {
  href: string;
  label: string;
}
interface IDocPage {
  mdxSource: string;
  frontMatter: IFrontMatter;
  layout: IDocumentationSidebarStructure;
  prev: IFooterNavigation;
  next: IFooterNavigation;
  lastEditDate: string;
  editLink: string;
}

const DocPage: NextPage<IDocPage> = ({
  mdxSource,
  frontMatter,
  layout,
  prev,
  next,
  lastEditDate,
  editLink,
}): JSX.Element => {
  return (
    <DocumentationLayout
      seo={{
        title: frontMatter.seoTitle,
        description: frontMatter.seoDescription,
      }}
      sidebarLayout={layout}
      footerNavigation={{ prev, next, lastEditDate, editLink }}
    >
      {/* @ts-ignore */}
      <MDXRemote {...mdxSource} components={components} />
    </DocumentationLayout>
  );
};

export default DocPage;

export const getStaticProps: GetStaticProps = async (props) => {
  const { params } = props;
  // @ts-ignore
  const fullName = withIndexFile(params.docPath, params.isIndex);
  const { source, fileName } = readMDFileFromPathOrIndex(fullName);
  const lastEditDate = getCommitDate(fileName);
  const editLink = getEditLink(fileName);

  const { mdxSource, data, seoTitle, seoDescription } = await prepareMdContent(
    source
  );
  const { layout, next, prev } = getLayout(fileName);

  return {
    props: {
      mdxSource,
      frontMatter: {
        ...data,
        seoTitle,
        seoDescription,
      },
      layout,
      next,
      prev,
      lastEditDate,
      editLink,
    },
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getMDPaths();
  createLayouts();

  return {
    paths,
    fallback: false,
  };
};
