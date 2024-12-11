<!-- Previous content up to Tabs section -->

# Hardhat documentation website

This is a NextJS-based application for the Hardhat documentation website. This app utilizes SSG for creating pages during the build step. It is developed with best practices in mind, including accessibility, SEO, performance optimizations, and scalability.

The app mainly provides two types of pages:

- Landing pages (see home page)
- Documentation pages (see documentation section)

<!-- Rest of the existing content until Tabs section -->

### Tabs

We use the plugin `remark-directive` to provide tabs functionality for showing alternative code examples or content variations. This is especially useful when showing code samples for different package managers or programming languages.

#### Basic Usage

The tabs system consists of two main components:
1. `tabsgroup` - A wrapper that contains multiple tabs and defines their possible values
2. `tab` - Individual tab containers that wrap content like code blocks

#### Examples

Here are some practical examples of how to use tabs:

1. **Package Manager Commands**
```
::::tabsgroup{options=npm,yarn,pnpm}
    :::tab{value=npm}
    ```bash
    npm install hardhat
    ```
    :::

    :::tab{value=yarn}
    ```bash
    yarn add hardhat
    ```
    :::

    :::tab{value=pnpm}
    ```bash
    pnpm add hardhat
    ```
    :::
::::
```

2. **Programming Language Examples**
```
::::tabsgroup{options="TypeScript,JavaScript"}
    :::tab{value=TypeScript}
    ```typescript
    async function deploy(): Promise<void> {
      const MyContract = await ethers.getContractFactory("MyContract");
      const contract = await MyContract.deploy();
      await contract.deployed();
    }
    ```
    :::

    :::tab{value=JavaScript}
    ```javascript
    async function deploy() {
      const MyContract = await ethers.getContractFactory("MyContract");
      const contract = await MyContract.deploy();
      await contract.deployed();
    }
    ```
    :::
::::
```

#### Parameters

1. **tabsgroup parameters**:
   - `options`: Required. A comma-separated list of tab values that will be available in this group.
   - Example: `options=npm,yarn,pnpm` or `options="TypeScript,JavaScript"`
   
2. **tab parameters**:
   - `value`: Required. Must match one of the options defined in the parent tabsgroup.
   - Example: `value=npm` or `value="TypeScript"`

#### Tips and Best Practices

- Use quotes (`""`) when your option/value contains spaces: `options="npm 7+,yarn 2"` 
- Keep related content in the same tabs group
- Use consistent option names across your documentation
- Each tab should contain complete, standalone content
- Consider adding a default selected tab for better user experience

<!-- Rest of the existing content -->

<!-- Other sections continue as before... -->
