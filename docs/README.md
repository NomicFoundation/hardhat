# Hardhat documentation website

This is a NextJS-based application for the Hardhat documentation website. This app utilizes SSG for creating pages during the build step. It is developed with best practices in mind, including accessibility, SEO, performance optimizations, and scalability.

The app mainly provides two types of pages:

- Landing pages (see home page)
- Documentation pages (see documentation section)

Landing pages are composed of reusable blocks and separate content files. Blocks are full-width React Components that can be stacked to compose a page. Blocks output content passed to them via props.

Documentation pages are generated from markdown files located in the `src/content` folder. This folder has a nesting structure that is mapped to the page URLs on the website.

It is assumed that the app will be hosted on the Vercel platform, which is highly optimized for SSG apps.

We consider two directions for the follow-up application growth:

- Creating and editing new content
- Adding new features to the app

The first one can be provided by working with human-friendly file formats located in the content folder (MD and YAML). Only minimal tech knowledge is needed for that. The second way requires developers' efforts.

## Preview

https://hardhat-lime.vercel.app/

## Adding content

Website content is located in `*.md` files within `src/content` folder. Its written in Markdown syntax. Folder structure in `content` is reflected on the website.

To adjust page behavior and appearance, also use optional `*.yaml` files with additional configurations.

To preview content locally, launch the app with `pnpm dev` and open http://127.0.0.1:3000 in your browser. See details in [Development](#development) section.

### Layouts

All content is organized by hierarchy levels and the top-level entries are layouts. The layout represents a set of folders and provides navigation within them. Currently, a folder should belong to one of the layouts. In terms of UI, the layout is equivalent to a sidebar navigation menu with two-level items. Layout settings can be found in the `src/content/layouts.yaml` file. It contains all layouts (currently "documentation" and "tutorial"). Each layout can have the following settings:

- title (optional)
- folders - the list of folders that should be included in this layout

### Folders

The next level is a folder. It can contain nesting folders and `*.md` files. Each `*.md` file represents a single documentation page. Folders usually are represented in a sidebar as a group of items with a common title - each item in this group opens a separate file in the folder. Folders can be nested but it only affects the page's path on the website, sidebar navigation is always of two levels. To configure folders we're using `_dirinfo.yaml` files which can contain the following settings:

**section-title**: the title of a group in the sidebar. It's optional, if skipped the folder name will be used.

**section-type**: this setting controls the appearance of the group in the sidebar. It can be:

- group - a regular group with a title and list of items
- single - good for groups with a single item
- hidden - the folder won't be shown in the sidebar but when you open a page from this group sidebar is present.
- plugins - the "special" group which is generated not from the `*.md` files located in the content folder, but from README.md files from plugin packages

**order**: an array of items in the order they should appear in the sidebar group. This is optional but if it's not specified the order will be based on file names. This array can contain two types of items:

- simple href strings (which are the same as a path to a file without a file extension. e.g. `/explanation/mining-modes`). Note it shouldn't contain the group folder name in the path. In this case, the title of the item will be generated automatically and will be the same as a page title.
- objects with `href` and `title` keys. In this case, href can be any valid relative link. The title specifies the title of that item in the sidebar. Note: this allows to specify anchor links e.g. `"#quick-start"` or an "index" links - `/`.

### MD Files

All documentation content is represented by `*.md` files with Markdown syntax. Besides the base Markdown syntax, we support the following features:

- MD Directives. Used to represent _Admonition_ components (currently `Tip` and `Warning`).
- Code syntax highlighting
- Line highlighting in code blocks.
- Code tabs with alternative languages

<!-- (// TODO: add md syntax examples) -->

### Redirects

Redirects allow you to redirect an incoming request path to a different destination path. Redirects settings are located in `redirects.config.js` file. It exports an array of objects. Each object represents a single redirect option. We utilize [NextJS Redirects](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) API for that.

### Tabs

We use the plugin `remark-directive` in order to provide tabs functionality.

#### Use

#### `tabsgroup` and `tab`

`tabsgroup` is a wrapper that wraps a group of tabs and sets all possible values of tabs.

`tab` is a wrapper that wraps a codeblock (or some other element).

#### Example:

```
::::tabsgroup{options=npm,yarn}
    :::tab{value=npm}
        // codeblock or some other element
    :::

    :::tab{value=yarn}
        // codeblock or some other element
    :::
::::
```

#### Parameters

Parameters are passed in curly braces.

`options-list` - required parameter. Comma separated strings, which is provided in tabs' `value` parameter.

`value` - required parameter. It should be provided as an option in `options-list` in `tabsgroup`.

You can use `space` symbol in parameters by wrapping `options/value` in quotes(`""`). Examples: `options="npm 7+,yarn"` / `value="npm 7"`.

### Front Matter

The front matter must be the first thing in the markdown file and must take the form of valid YAML set between triple-dashed lines. Here is an example:

```
---
title: Overview
description: Hardhat | Ethereum development environment for professionals
prev: false
next: false
---
```

You can specify `title`, `description` for SEO manually or disable `prev` and `next` links for Footer Navigation by using Front Matter.

## Development

This website is an SSG application based on Next.js. To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

First, install dependencies:

```sh
cd docs
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) with your browser to see the result.

You can start editing the page by modifying `src/pages/...`. The page auto-updates as you edit the file.

### Folder structure

When developing the application you might need these main folders

- src/components - React Components for rendering pages
- src/components/landingBlocks - "Building blocks" for creating landing pages
- src/components/mdxComponents - Components used to render markdown content
- src/components/ui - common UI components
- src/hooks - common React hooks
- src/model - business logic files
- src/pages - NextJS pages. `[...docPath].tsx` means multiple pages will be generated. Page routes are based on the relative paths
- src/styles - global CSS styles
- src/config.ts - keep main information about the app.
- public/ - static files
- .storybook/ - Storybook settings
- next.config.js - NextJS config
- redirects.config.js - Custom redirects

## Storybook

You can use Storybook to develop components in isolation. Launch it via `pnpm storybook` and open http://127.0.0.1:6006/ You will see a list of components in the left-side sidebar. When you edit component's code and save it, the Storybook is auto-updating it.

Each component can be exposed with different states (stories) independently by passing props you need. You can find component stories settings in `Component.stories.ts` files.

We also deploy updated storybook on each build. You can find it on https://hardhat-storybook.netlify.app/

## Content-generating technical details

There are two relatively independent processes in the build step:

1. Generating pages themselves. We get page paths directly from the files located in the content folder. Their paths are mapped to the page routes. Layout settings don't affect page existence.
2. Generating layouts and mapping layouts to pages. For that, we're checking which folders belong to what layout and assigning that layout to a page

Page paths are generated in the `getStaticPaths` functions in files of the `page` folder. The result of these functions is an array of page paths. Page props are generated with the `getStaticProps` function, which is executed once per page with a page path passed as an argument and returns all required page props.

Execution of `getStaticPaths` and `getStaticProps` is handled by NextJS on a build step and it runs them in isolation (which means we can't share common calculated parameters within them). To optimize building time, we store an intermediate config in a temporary file on the `getStaticPaths` execution and read it from `getStaticProps` functions. It contains layout settings and a map of pages with specific props.

## Styling

We utilize [Linaria](https://github.com/callstack/linaria) for styling components. It has the "Styled Components" syntax but generates css without runtime which works fine with SSG sites.

## Theming

The documentation section is Themeable. A user can switch between light, dark and high contrast themes for their convenience. There is also an "Auto" setting when theme is selected based on a user system settings.

Theming solution provides abilities to switch themes, keep the selected value in user's local storage, seamlessly keep selected page on navigating and page refreshing.

We manage themes by applying a CSS class to the HTML body. Each component has special selectors in its CSS to reflect change color depending on selected theme. To support themes, components should provide styles for all app themes (add selectors and specify colors).

Landing pages don't support themes.

## Creating new landings

Landing pages contain special "blocks" see src/components/landingBlocks. To create a new landing page start from copying `/pages/index.tsx` and `src/content/home.ts`. You can create another page by reordering existing blocks and passing another content to them. If necessary create new landing blocks.

## CI/CD

We use two CI/CD providers:

- Github actions for launching code checks
- Vercel to deploy app

Each branch triggers its own process on CI/CD so you can see code check details on Github and preview the current branch on Vercel.
