# Overlay CSS MCP — frontend guideline

Use this when styling OBS overlays, managing the question bank via chatbot, or configuring MCP.

## Prerequisites

1. Nest / Obs Trivia API is running (default port **4000**).
2. Cursor (or another MCP client) can reach that host.

## Cursor MCP configuration

```json
{
  "mcpServers": {
    "obs-trivia-game": {
      "url": "http://localhost:4000/mcp"
    }
  }
}
```

- Transport: **HTTP** (`POST /mcp`), not stdio.
- If `PORT` is not `4000`, change the URL to match.
- With Vite (`frontend` on 3001), MCP still talks to the **API** origin (4000), not the Vite origin.

## Tools — overlay CSS

| Tool | Use |
|------|-----|
| `get_overlay_style_guide` | Allowed selectors / constraints |
| `get_overlay_css` | Read current custom CSS |
| `set_overlay_css` | Replace custom CSS (full document) |
| `get_mcp_endpoint` | Confirms `/mcp` |

Custom CSS is injected into [`/overlay/questions`](http://localhost:4000/overlay/questions) and [`/overlay/scoreboard`](http://localhost:4000/overlay/scoreboard). Base styles: [`src/styles/overlay.css`](../src/styles/overlay.css).

Prefer overlay selectors (`.overlay-page`, `.live-round-panel*`, `.countdown-display*`, `.scoreboard-list`). Avoid dashboard chrome.

## Tools — question bank CRUD

| Tool | Use |
|------|-----|
| `get_question_writing_guide` | **Read first** — 2-line layout, fit boxes, when to use `\n` |
| `list_questions` | Paginated list |
| `get_question` | By `id` |
| `create_question` | Create question |
| `update_question` | Patch by `id` |
| `delete_question` | Delete by `id` (blocked if question is in an active round) |

### Text layout (for create/update)

| Field | Fit box |
|-------|---------|
| Question | **768×80px** (max 2 lines) |
| Each answer | **364×80px** (max 2 lines) |

## Related files

- API docs: [`../../mcp/overlay-css/README.md`](../../mcp/overlay-css/README.md)
- Nest handler: `src/mcp/` (repo root)
