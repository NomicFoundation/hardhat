### Tabs

We use the plugin `remark-directive` to provide tabs functionality for showing alternative code examples or content variations. This is especially useful for documentation that needs to accommodate different:

- Package managers (npm, yarn, pnpm)
- Programming languages (JavaScript, TypeScript)
- Operating systems (Windows, macOS, Linux)
- Configuration formats (hardhat.config.js, hardhat.config.ts)

#### Basic Structure

The tabs system uses two main components:
1. `tabsgroup` - Wrapper that defines all possible tab values
2. `tab` - Individual content containers that match the defined values

#### Simple Example

```markdown
::::tabsgroup{options=npm,yarn}
    :::tab{value=npm}
    npm install hardhat
    :::

    :::tab{value=yarn}
    yarn add hardhat
    :::
::::
```

#### Comprehensive Examples

1. **Package Manager Installation Commands**
```markdown
::::tabsgroup{options=npm,yarn,pnpm}
    :::tab{value=npm}
    ```bash
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
    ```
    :::

    :::tab{value=yarn}
    ```bash
    yarn add --dev hardhat @nomicfoundation/hardhat-toolbox
    ```
    :::

    :::tab{value=pnpm}
    ```bash
    pnpm add --save-dev hardhat @nomicfoundation/hardhat-toolbox
    ```
    :::
::::
```

2. **Configuration Files**
```markdown
::::tabsgroup{options="TypeScript,JavaScript"}
    :::tab{value=TypeScript}
    ```typescript
    import { HardhatUserConfig } from "hardhat/config";
    import "@nomicfoundation/hardhat-toolbox";

    const config: HardhatUserConfig = {
      solidity: "0.8.19",
      networks: {
        hardhat: {},
        localhost: {
          url: "http://127.0.0.1:8545"
        }
      }
    };

    export default config;
    ```
    :::

    :::tab{value=JavaScript}
    ```javascript
    require("@nomicfoundation/hardhat-toolbox");

    /** @type import('hardhat/config').HardhatUserConfig */
    module.exports = {
      solidity: "0.8.19",
      networks: {
        hardhat: {},
        localhost: {
          url: "http://127.0.0.1:8545"
        }
      }
    };
    ```
    :::
::::
```

#### Parameters

1. **tabsgroup Parameters**
   - `options`: (Required) Comma-separated list of available tab values
   - Example: `options=npm,yarn,pnpm` or `options="TypeScript,JavaScript"`
   - Use quotes (`""`) when values contain spaces: `options="Windows PowerShell,Mac Terminal"`

2. **tab Parameters**
   - `value`: (Required) Must match one of the options from parent tabsgroup
   - Example: `value=npm` or `value="Windows PowerShell"`

#### Best Practices

1. **Consistent Naming**
   - Use consistent capitalization and naming across all documentation
   - Example: Always use "TypeScript" not "typescript" or "Typescript"
   - Keep option names identical across similar tab groups

2. **Content Completeness**
   - Each tab should contain complete, standalone content
   - Don't reference content from other tabs
   - Include all necessary context within each tab

3. **Ordering**
   - Maintain consistent order across similar tab groups
   - Common ordering patterns:
     - npm → yarn → pnpm
     - TypeScript → JavaScript
     - Windows → macOS → Linux

4. **Formatting**
   - Include blank lines between tabs for readability
   - Properly indent nested content
   - Use consistent code formatting within code blocks

5. **Accessibility**
   - Use clear, descriptive tab names
   - Ensure code examples are properly highlighted
   - Maintain good contrast in syntax highlighting

### Common Use Cases

1. **Installation Instructions**
   - Package manager commands
   - Platform-specific setup steps
   - Dependencies installation

2. **Configuration Examples**
   - Different config file formats
   - Environment-specific configurations
   - Plugin configurations

3. **Code Examples**
   - Language variants (TypeScript/JavaScript)
   - Framework-specific implementations
   - Testing frameworks

4. **API Usage**
   - Different client libraries
   - Language-specific API calls
   - Authentication methods

The rest of the documentation continues as before...