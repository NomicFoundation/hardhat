# Hardhat documentation website

This is an NextJS based application for Hardhat documentation website. This app is utilizing SSG for creating pages on the build step. It's developed with keeping the best practices in mind including accessability, SEO and Performance optimizations, scalability.

The app mainly provides pages of two types:

- landing pages (see home page)
- documentation pages (see documentation section)

Landing pages are composed from reusable blocks and separate content files. Blocks are full width React Components that can be stacked to compose a page. Blocks output a content passed to them via props.

Documentation pages are generated from markdown files located in the `src/content` folder. This folder has nesting structure which is mapped to the pages URLs on the website.

It's assumed that the app will be hosted on Vercel platform with is highly optimized for SSG apps.

We consider two directions of the follow up application growing:

- by creating and editing new content.
- by adding new features to the app.

The first one can be provided by working with human friendly file formats located in the content folder (\*.md and yaml). Only minimal tech knowledge are needed for that. The second way requires developers efforts.

## Preview

https://hardhat-lime.vercel.app/

## Storybook

https://hardhat-storybook.netlify.app/

## Adding content

Website content is located in `*.md` files withing `src/content` folder. It's written in Markdown syntax. Folders structure in `content` is reflected on the website.

In order to tune pages behavior and appearance with also use optional `*.yaml` files with additional configurations.

### Layouts

All content is organized by an hierarchy levels and the top level entries are layouts. Layout represents a set of folders and provides a navigation withing them. Currently a folder should belong to one of the layouts. In therms of UI layout is equal to a sidebar navigation menu with two level items. Layouts settings can be found in the `src/content/layouts.yaml` file. It contains all layouts (currently "documentation" and "tutorial"). Each layout can have the following settings:

- title (optional)
- folders - the list of folders should be included into this layout

### Folders

The next level is a folder. It can contain nesting folders and `*.md` files. Each `*.md` file represents a single documentation page. Folders usually are represented in a sidebar as a group of items with a common title - each item in this group opens a separate file in the folder. Folders can be nested but it's only affect pages path on website, sidebar navigation is always of two levels. To configure folders we're using `_dirinfo.yaml` files which can contain the following settings:

**section-title**: the title of a group in sidebar. It's optional, if skipped the folder name will be used.

**section-type**: this settings controls appearance of the group in sidebar. It can be:

- group - regular group with a title and list of items
- single - good for groups with a single item
- hidden - the folder won't be shown in sidebar but when you open a page from this group sidebar is present.
- plugins - the "special" group with is generated not from the `*.md` files located in content folder, but from README.md files from plugin packages

**order**: an array of item in the order they should appear in the sidebar group. This is optional but if it's not specified the order will be based on file names. This array can contain two type of items:

- simple href strings (which the same as a path to a file without file extension. e.g. `/explanation/mining-modes`). Note it shouldn't contain the group folder name in the path. In this case the title of the item will be generated automatically and will be the same as a page title.
- objects with `href` and `title` keys. In this case href can be any valid relative link. Title specifies the title of that item in sidebar. Note: this allows to specify anchor links e.g. `"#quick-start"` or a "index" links - `/`.

### MD Files

All documentation content is represented by `*.md` files with Markdown syntax. Besides the base Markdown syntax we support the following features:

- MD Directives. Used to represent _Admonition_ components (currently `Tip` and `Warning`).
- Code syntax highlighting
- Line highlighting in code blocks.
- Code tabs with alternative languages

<!-- (// TODO: add md syntax examples) -->


### Redirects

Redirects allow you to redirect an incoming request path to a different destination path. Redirects settings are located in `redirects.config.js` file. It exports array of objects. Each object represents a single redirect option. We utilize [NextJS Redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects) API for that.

## Development

This website is a SSG application based on Next.js. To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

First, install dependencies:

```sh
cd docs
yarn
```

Then, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/pages/...`. The page auto-updates as you edit the file.

## Content generating tech details

There two relatively independent processes on the build step:

1. Generating pages itself. We get pages paths directly from the files located in the content folder. Their paths are mapped to the page routes. Layout settings doesn't affect to pages existence.
2. Generating layouts and mapping layouts to pages. For that we're checking which folders belongs to what layout and assigning that layout to a page

Page paths are generated in the `getStaticPaths` functions in files of the `page` folder. The result of these functions is array of pages paths. Page pros are generated with the `getStaticProps` function which is executed once per a page with a page path passed as an argument and returns all required page props.

Execution of `getStaticPaths` and  `getStaticProps` is handled by NextJS on a build step and it runs them in isolation (means we can't share a common calculated parameters withing them). In order to optimize a building time we store an intermediate config in a temporary file on the `getStaticPaths` execution and read it from  `getStaticProps` functions. It contains layout settings and a map of pages with a specific props.
