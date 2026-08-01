# Obs Trivia MCP (Nest HTTP)

MCP is served by the Obs Trivia Nest API:

`POST http://127.0.0.1:4000/mcp`

(Start the app / `npm run dev` first — same port as GraphQL.)

## Cursor MCP config

```json
{
  "mcpServers": {
    "obs-trivia-game": {
      "url": "http://127.0.0.1:4000/mcp"
    }
  }
}
```

## Tools

### Overlay CSS

| Tool | Description |
|------|-------------|
| `get_overlay_style_guide` | Safe selectors / rules |
| `get_overlay_css` | Read `overlayCustomCss` |
| `set_overlay_css` | Replace `overlayCustomCss` |
| `get_mcp_endpoint` | Echoes `/mcp` |

### Question bank

| Tool | Description |
|------|-------------|
| `list_questions` | Offset pagination (`offset`, `limit`) |
| `get_question` | By `id` |
| `create_question` | `text`, `optionA`–`D`, `correctAnswer`, optional `countdownSeconds` |
| `update_question` | Partial update by `id` |
| `delete_question` | By `id` |

Frontend guideline: [`../../frontend/docs/overlay-css-mcp.md`](../../frontend/docs/overlay-css-mcp.md)

## Security

Local-only use. Do not expose `/mcp` on a public network without auth.
