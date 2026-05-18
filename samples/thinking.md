Now I'm thinking about how to structure the response.
I need to consider mixed formatting and edge cases.

Here's what I'm planning:

1. Start with the type definitions
2. Then implement the core `validate()` function
3. Finally add the error handling

Wait, let me reconsider. Maybe I should use `Result` types here
instead of throwing exceptions. The `parse()` method already returns
an `Option<T>` so we can chain with `.map()`. 

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
