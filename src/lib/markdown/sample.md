<thinking>Now I'm thinking about how to structure the response.
I need to consider mixed formatting and edge cases.

Here's what I'm planning:

1. Start with the type definitions
2. Then implement the core `validate()` function
3. Finally add the error handling

Wait, let me reconsider. Maybe I should use `Result` types here
instead of throwing exceptions. The `parse()` method already returns
an `Option<T>` so we can chain with `.map()`.
</thinking>

# Markdown Renderer Sample

This is a paragraph with **bold text**, *italic text*, and `inline code`.

Here's a paragraph with a [link to example.com](https://example.com).

---

## Code Blocks

```
const greeting = "Hello, world!";
console.log(greeting);

function add(a: number, b: number): number {
  return a + b;
}
```

### Fenced with language

```ts
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}!`;
}
```

```json
{
  "name": "example",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc"
  }
}
```

```py
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

```diff
-function add(a: number, b: number): number {
-  return a + b;
+function add(a: number, b: number): number {
+  return a + b;
 }
```

<thinking>
Let me think about this carefully.

The user is asking a complex question that requires step-by-step reasoning.
I should break this down into smaller parts. First, I need to consider the
edge cases with `null` values and the `parse()` function.
</thinking>
---

## Mixed Content

Normal text with **bold and *italic* nested** and more text.

Another paragraph with `code` in the middle of it and **bold at the end**.

Here's a paragraph with ~~strikethrough text~~ and `inline code` mixed with **bold**.

---

## Table

| Name      | Role         | Location |
|-----------|-------------|----------|
| Alice     | Engineer    | NYC      |
| Bob       | Designer    | SF       |
| Charlie   | Manager     | London   |

---

## Lists

- List item with **bold**
- Another item with `inline code` inside
- Item with a `parse()` call and **nested formatting**
  1. Nested ordered item
  2. Another nested item
     - Deeply nested bullet
     - Another deep bullet

Task list:
- [x] Completed task
- [ ] Pending task

---

## Blockquotes

> This is a simple blockquote with some text.

> A blockquote with **bold**, *italic*, and `inline code` all mixed together.

> > A nested blockquote for good measure.

---

## More Code

You can reference `map()` and `filter()` inline, or use `Array.from()` with a `Set<T>`. For async code, use `await Promise.all([...])`.

Here's a short `cURL` example:

```sh
curl -X POST https://api.example.com/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

And a quick SQL query:

```sql
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id
HAVING order_count > 5;
```

