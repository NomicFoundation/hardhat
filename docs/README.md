# Hardhat documentation website

## Preview

https://hardhat-lime.vercel.app/

## Storybook

https://hardhat-storybook.netlify.app/

## Adding content

Website content is located in `*.md` files withing `src/pages` folder. It's written in Markdown syntax. Folders structure in `pages` is reflected on the website.

### Redirects

Redirects allow you to redirect an incoming request path to a different destination path. Redirects settings are located in `redirects.config.js` file. It exports array of objects. Each object represents a single redirect option.
We utilize [NextJS Redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects) API for that.



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
