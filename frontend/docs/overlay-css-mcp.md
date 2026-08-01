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
      "url": "http://127.0.0.1:4000/mcp"
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

Custom CSS is injected into `/overlay` and `/scoreboard-overlay`. Base styles: [`src/styles/overlay.css`](../src/styles/overlay.css). After `set_overlay_css`, overlays refresh within ~5s (Settings **Save** not required for MCP writes).

Prefer overlay selectors (`.overlay-page`, `.live-round-panel*`, `.countdown-display*`, `.scoreboard-list`). Avoid dashboard chrome (`.layout`, `.setup-wizard`, `.question-table`).

## Tools — question bank CRUD

| Tool | Use |
|------|-----|
| `list_questions` | Paginated list (`offset`, `limit` 1–100, default 10) |
| `get_question` | One question by `id` |
| `create_question` | Create (`text`, `optionA`–`D`, `correctAnswer` A\|B\|C\|D, optional `countdownSeconds` 5–600) |
| `update_question` | Patch by `id` (only provided fields) |
| `delete_question` | Delete by `id` |

## Related files

- API docs: [`../../mcp/overlay-css/README.md`](../../mcp/overlay-css/README.md)
- Nest handler: `src/mcp/` (repo root)
- Settings UI: [`src/pages/Settings.tsx`](../src/pages/Settings.tsx)
