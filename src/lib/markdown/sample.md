# Markdown Renderer Sample

This is a paragraph with **bold text**, *italic text*, and `inline code`.

Here's a paragraph with a [link to example.com](https://example.com).

## Code Blocks

```
const greeting = "Hello, world!";
console.log(greeting);

function add(a: number, b: number): number {
  return a + b;
}
```

## Mixed Content

Normal text with **bold and *italic* nested** and more text.

Another paragraph with `code` in the middle of it and **bold at the end**.

---

## Lists (Fallback)

- Deferred list item
- Another deferred item
  1. Nested deferred

Deferred content appears as raw text since lists aren't implemented yet.
