# Using Tabs in Documentation

The Hardhat documentation uses tabs to present alternative versions of content, such as different package managers or programming languages. This guide explains how to use tabs effectively.

## Basic Usage

Tabs are implemented using the `remark-directive` plugin. Here's a simple example:

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

## Parameters

- For tabsgroup: Use `options` to list available tabs
- For individual tabs: Use `value` to specify which option this tab represents

## Best Practices

1. Use consistent naming across docs
2. Include complete information in each tab
3. Maintain consistent ordering
4. Use quotes for values with spaces

## Examples

See the main README.md for full examples and implementation details.
