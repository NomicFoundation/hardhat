# Hardhat文档网站

这是一个基于NextJS的应用程序，用于Hardhat文档网站。该应用程序使用SSG在构建步骤中创建页面。它的开发着眼于遵循最佳实践，包括可访问性、SEO和性能优化以及可扩展性。

该应用程序主要提供两种类型的页面：

首页（请参阅主页）
文档页面（请参阅文档部分）
首页由可重用块和单独的内容文件组成。块是满宽度的React组件，可以堆叠起来构成一个页面。块通过属性输出传递给它们的内容。

文档页面是从位于`src/content`文件夹中的markdown文件生成的。该文件夹具有映射到网站上页面URL的嵌套结构。

假设应用程序将在为SSG应用程序进行了优化的Vercel平台上托管。

我们认为应用程序的两个增长方向：

- 通过创建和编辑新内容。
- 通过向应用程序添加新功能。

第一种方法可以通过使用位于内容文件夹中的人性化文件格式（MD和YAML）来提供。只需要最少的技术知识即可完成。第二种方法需要开发人员的努力。
## 预览

https://hardhat-lime.vercel.app/

## 添加内容

网站内容都在 `*.md` 文件中 ， `src/content`文件夹下。 它用Markdown语法编写。`content`中的文件夹结构在网站上映射出来。

要调整页面，行为和外观，还可以使用具有附加配置的可选`*.yaml`文件。

要在本地预览内容，请使用`yarn dev`启动应用程序，并在浏览器中打开http://127.0.0.1:3000。详见 [Development](#development) 部分。

### 布局

所有内容都按层次组织，顶级条目是布局。布局表示一组文件夹并在其中提供导航。目前，文件夹应该属于布局之一。就UI而言，布局等同于带有两级项目的侧边栏导航菜单。可以在`src/content/layouts.yaml`文件中找到布局设置。它包含所有布局（目前为“文档”和“教程”）。每个布局都可以具有以下设置：

- title (可选)
- folders - 应包括在此布局中的文件夹列表。

### 文件夹

下一级是文件夹。它可以包含嵌套文件夹和`*.md`文件。每个`*.md`文件表示单个文档页面。文件夹通常在侧边栏中作为具有共同标题的项目组表示 - 此组中的每个项目在文件夹中打开一个单独的文件。文件夹可以嵌套，但它仅影响网站上页面的路径，侧边栏导航始终为两级。为了配置文件夹，我们使用可以包含以下设置的`_dirinfo.yaml`文件：

**section-title**：侧边栏中组的标题。它是可选的，如果省略，将使用文件夹名称。

**section-type**：此设置控制侧边栏中组的外观。它可以是：

- group - 包含标题和项目列表的常规组。
- single - 适用于仅有一个项目的组。
- hidden - 文件夹不会显示在侧边栏中，但当您从此组侧边栏打开页面时侧边栏就会出现。
- plugins - “特殊”组不是从内容文件夹中的`*.md`文件生成的，而是从插件包的README.md文件生成的。

**order**：侧边栏组中项目的顺序数组。这是可选的，但如果没有指定，则顺序将基于文件名。此数组可以包含两种类型的项目：


- 简单的href字符串（与文件路径相同，而不带文件扩展名。例如`/explanation/mining-modes`）。请注意，路径中不应包含组文件夹名称。在这种情况下，项目的标题将被自动生成，并且将与页面标题相同。

- 具有`href`和`title`键的对象。在这种情况下，href可以是任何有效的相对链接。标题指定侧边栏中该项目的标题。注意：这允许指定锚链接，例如`#quick-start`或`index`链接 - /。

### MD 文件

所有文档内容都由具有Markdown语法的`*.md`文件表示。除了基本的Markdown语法之外，我们还支持以下功能：

- MD指令。用于表示_Admonition_组件（目前为`Tip`和`Warning`）。
- 代码语法突出显示
- 代码块中的行高亮。
- 具有替代语言的代码选项卡。

<!-- (// TODO: add md syntax examples) -->

### 重定向

重定向允许您将传入请求路径重定向到不同的目标路径。重定向设置位于`redirects.config.js`文件中。它导出了一个对象数组。每个对象表示单个重定向选项。 我们使用 [NextJS Redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects) API 来实现.

### 选项卡

我们使用插件`remark-directive`来提供选项卡功能。

#### Use

#### `tabsgroup` 和 `tab`

`tabsgroup` 是一个包装器，它包装了一组选项卡并设置了所有可能的选项卡值。

`tab` 是一个包装器，用于包装代码块（或其他元素）。

#### 案例:

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

#### 参数 

参数在大括号中传递

`options-list` - 必需参数。用逗号分隔的字符串，在选项卡的`value`参数中提供。  
`value` - 必需参数。应作为`options-list`中的选项提供在`tabsgroup`中。

你可以在参数中使用`space`符号，通过将`options/value`用引号包装（""）来实现。例如：`options="npm 7+,yarn"`/ `value="npm 7"`。
### YAML头信息

YAML头信息必须是Markdown文件中的第一件事，并且必须以三条连续的减号构成有效的YAML设置。以下是一个例子：
```
---
title: Overview
description: Hardhat | Ethereum development environment for professionals
prev: false
next: false
---
```

您可以通过使用YAML头信息，手动指定用于SEO的`title`和`description`，或禁用页脚导航中的`prev`和`next`链接。


## 开发

本网站是基于Next.js的SSG应用程序。要了解更多关于Next.js的信息，请查看以下资源：

- [Next.js Documentation](https://nextjs.org/docs) - 了解Next.js的功能和API.
- [Learn Next.js](https://nextjs.org/learn) - 交互式Next.js教程.

首先, 安装依赖:

```sh
cd docs
yarn
```

然后, 运行部署服务器:

```bash
yarn dev
```

 [http://127.0.0.1:3000](http://127.0.0.1:3000) 用浏览器打开查看结果

您可以通过修改`src/pages/...`开始编辑页面。随着您编辑文件，页面会自动更新。

### 文件夹结构

当开发应用时你或许需要这些主要文件夹

- src/components文件夹包含用于渲染页面的React组件。

- src/components/landingBlocks文件夹包含用于创建首页的“构建块”。

- src/components/mdxComponents文件夹包含用于渲染 Markdown 内容的组件。

- src/components/ui文件夹包含常用的 UI 组件。

- src/hooks文件夹包含常用的 React hooks。

- src/model文件夹包含业务逻辑文件。

- src/pages文件夹包含 NextJS 页面。`[...docPath].tsx`意味着将生成多个页面。页面路由基于相对路径。

- src/styles文件夹包含全局 CSS 样式。

- src/config.ts文件包含应用程序的主要信息。

- public/文件夹包含静态文件。

- .storybook/文件夹包含 Storybook 设置。

- next.config.js文件包含 NextJS 配置。

- redirects.config.js文件包含自定义重定向。

## Storybook

Storybook 是一个用于开发组件的工具，可以让你在隔离的环境中开发组件。通过 `yarn storybook` 命令启动它，然后在浏览器中打开 http://127.0.0.1:6006/。你会看到左侧边栏中的组件列表。当你编辑组件的代码并保存时，Storybook 会自动更新它。

每个组件都可以通过传递所需的属性来独立地将不同的状态（故事）暴露出来。您可以在 `Component.stories.ts` 文件中找到组件故事设置。

我们还会在每次构建时部署更新后的 storybook。您可以在 https://hardhat-storybook.netlify.app/ 中找到它。

## 内容生成技术细节

在构建步骤中有两个相对独立的过程:

1. 生成页面本身。 我们直接从位于内容文件夹中的文件获取页面路径。 它们的路径映射到页面路由。 布局设置不会影响页面的存在。
2. 生成布局并将布局映射到页面。为此，我们检查哪些文件夹属于哪个布局，并将该布局分配给页面。

页面路径在 `page` 文件夹中的 `getStaticPaths` 函数中生成。这些函数的结果是一个页面路径数组。页面属性由 `getStaticProps` 函数生成，该函数每次执行一个页面时都会将页面路径作为参数并返回所有所需的页面属性。
`getStaticPaths` 和 `getStaticProps` 函数的执行由 NextJS 处理，并在构建步骤中以隔离方式运行（这意味着我们无法在它们之间共享公共计算参数）。为了优化构建时间，我们在 `getStaticPaths` 函数执行时存储一个中间配置文件，并从 `getStaticProps` 函数中读取它。该配置文件包含布局设置和页面属性映射。

## 样式

我们使用 [Linaria](https://github.com/callstack/linaria) 来对组件进行样式化. 它具有“Styled Components”语法，但是能够在没有运行时的情况下生成 css，这对于 SSG 站点来说非常方便。

## 主题

文档部分可以自定义主题。用户可以在浅色、深色和高对比度主题之间切换，以方便自己。还有一个“自动”设置，根据用户的系统设置选择主题。

主题解决方案提供了切换主题、在用户的本地存储中保留所选值、无缝保留导航时所选页面以及刷新页面的功能。

我们通过向 HTML body 应用 CSS 类来管理主题。每个组件都有特殊的选择器，用于反映根据所选主题更改颜色。为了支持主题，组件应提供所有应用主题的样式（添加选择器并指定颜色）。

着陆页面不支持主题

## 创建新的着陆页面

着陆页面包含特殊的“块”，请参阅 src/components/landingBlocks。要创建一个新的着陆页面，请从复制 `/pages/index.tsx` 和 `src/content/home.ts` 开始。您可以通过重新排列现有块并将另一个内容传递给它们来创建另一个页面。如果需要，请创建新的着陆块。

## CI/CD

我们使用两个 CI/CD 提供商：

- Github actions 用于启动代码检查
- Vercel 用于部署应用程序。

每个分支都会在 CI/CD 中触发自己的流程，因此您可以在 Github 上查看代码检查详细信息，并在 Vercel 上预览当前分支。
