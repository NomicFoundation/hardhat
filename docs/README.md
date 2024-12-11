### Tabs

We use the plugin `remark-directive` to provide tabs functionality for showing alternative content versions, such as different package managers or programming languages. This is especially useful for providing a consistent experience regardless of a user's preferred tools.

#### Basic Structure

The tabs system uses two main directives:

1. `tabsgroup` - The outer wrapper that defines available tab options
2. `tab` - Individual content containers within the group

#### Syntax

```markdown
::::tabsgroup{options="option1,option2"}
    :::tab{value=option1}
        Content for option 1
    :::

    :::tab{value=option2}
        Content for option 2
    :::
::::
```

#### Real-World Examples

1. **Package Manager Installation**
```markdown
::::tabsgroup{options=npm,yarn,pnpm}
    :::tab{value=npm}
    ```bash
    npm install hardhat --save-dev
    ```
    :::

    :::tab{value=yarn}
    ```bash
    yarn add hardhat --dev
    ```
    :::

    :::tab{value=pnpm}
    ```bash
    pnpm add hardhat --save-dev
    ```
    :::
::::
```

2. **Language Variants**
```markdown
::::tabsgroup{options="TypeScript,JavaScript"}
    :::tab{value=TypeScript}
    ```typescript
    import { HardhatUserConfig } from "hardhat/config";
    
    const config: HardhatUserConfig = {
      solidity: "0.8.19"
    };
    
    export default config;
    ```
    :::

    :::tab{value=JavaScript}
    ```javascript
    /** @type import('hardhat/config').HardhatUserConfig */
    const config = {
      solidity: "0.8.19"
    };
    
    module.exports = config;
    ```
    :::
::::
```

#### Parameters

1. **tabsgroup Parameters**:
   - `options`: (Required) Comma-separated list of available tab values
   - Example: `options=npm,yarn,pnpm` or `options="TypeScript,JavaScript"`

2. **tab Parameters**:
   - `value`: (Required) Must match one of the parent tabsgroup's options
   - Example: `value=npm` or `value=TypeScript`

#### Best Practices

1. **Naming Consistency**
   - Use consistent option names across documentation
   - Example: Always use "TypeScript" not "typescript" or "Typescript"

2. **Spacing**
   - Include a blank line between tabs for better readability
   - Indent the tab content for clear nesting

3. **Quotes Usage**
   - Use quotes for values with spaces: `options="Node.js API,Configuration file"`
   - Simple values don't need quotes: `options=npm,yarn`

4. **Content Completeness**
   - Each tab should contain complete, standalone content
   - Avoid referring to content in other tabs

5. **Order Consistency**
   - Maintain consistent option ordering across similar tab groups
   - Example: Always put TypeScript before JavaScript, or NPM before Yarn

#### Common Use Cases

- Package manager commands
- Language-specific code examples
- Configuration formats
- Operating system-specific instructions
- API usage examples in different languages

