#!/usr/bin/env node
/**
 * Stdio MCP server: read/write Obs Trivia overlay custom CSS via local GraphQL.
 *
 * Env:
 *   STREAM_TRIVIA_GRAPHQL_URL  default http://127.0.0.1:4000/graphql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STYLE_GUIDE_PATH = path.join(__dirname, 'style-guide.md');
const OVERLAY_CSS_PATH = path.join(REPO_ROOT, 'frontend', 'src', 'styles', 'overlay.css');

const GRAPHQL_URL =
  process.env.STREAM_TRIVIA_GRAPHQL_URL?.trim() || 'http://localhost:4000/graphql';

function sanitizeCss(css) {
  return String(css ?? '')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '/* blocked expression( */')
    .replace(/javascript\s*:/gi, '/* blocked javascript: */');
}

async function graphql(query, variables) {
  let res;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot reach GraphQL at ${GRAPHQL_URL} (${msg}). Start Obs Trivia / Nest first (default port 4000).`
    );
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`GraphQL returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

function textResult(text, isError = false) {
  return {
    content: [{ type: 'text', text }],
    isError,
  };
}

const server = new McpServer({
  name: 'stream-trivia-overlay-css',
  version: '1.0.0',
});

server.registerTool(
  'get_app_graphql_url',
  {
    title: 'Get GraphQL URL',
    description: 'Returns the GraphQL endpoint used by this MCP server.',
  },
  async () => textResult(GRAPHQL_URL)
);

server.registerTool(
  'get_overlay_style_guide',
  {
    title: 'Overlay CSS style guide',
    description:
      'Returns safe overlay CSS selectors and rules for Obs Trivia OBS overlays. Prefer these selectors when generating overrides.',
  },
  async () => {
    const guide = fs.readFileSync(STYLE_GUIDE_PATH, 'utf8');
    let overlayCssNote = '';
    if (fs.existsSync(OVERLAY_CSS_PATH)) {
      overlayCssNote = `\n\n---\nBase overlay stylesheet path (repo):\n${OVERLAY_CSS_PATH}\n`;
    }
    return textResult(guide + overlayCssNote);
  }
);

server.registerTool(
  'get_overlay_css',
  {
    title: 'Get overlay custom CSS',
    description:
      'Reads the current overlayCustomCss setting from the running Obs Trivia GraphQL API.',
  },
  async () => {
    try {
      const data = await graphql(`
        query GetOverlayCss {
          appSettings {
            overlayCustomCss
            updatedAt
          }
        }
      `);
      const css = data?.appSettings?.overlayCustomCss ?? '';
      const updatedAt = data?.appSettings?.updatedAt ?? '';
      return textResult(
        JSON.stringify({ overlayCustomCss: css, updatedAt, graphqlUrl: GRAPHQL_URL }, null, 2)
      );
    } catch (err) {
      return textResult(err instanceof Error ? err.message : String(err), true);
    }
  }
);

server.registerTool(
  'set_overlay_css',
  {
    title: 'Set overlay custom CSS',
    description:
      'Replaces overlayCustomCss on the running Obs Trivia app. Pass the full CSS document. Overlays poll and apply within a few seconds.',
    inputSchema: {
      css: z.string().describe('Full overlay custom CSS to save (replacement, not a patch).'),
    },
  },
  async ({ css }) => {
    try {
      const cleaned = sanitizeCss(css);
      const data = await graphql(
        `
          mutation UpdateOverlayCss($input: UpdateAppSettingsInput!) {
            updateAppSettings(input: $input) {
              overlayCustomCss
              updatedAt
            }
          }
        `,
        { input: { overlayCustomCss: cleaned } }
      );
      const saved = data?.updateAppSettings;
      return textResult(
        JSON.stringify(
          {
            ok: true,
            overlayCustomCss: saved?.overlayCustomCss ?? cleaned,
            updatedAt: saved?.updatedAt ?? null,
            note: 'Overlays refresh custom CSS within ~5s (or refresh the OBS browser source).',
          },
          null,
          2
        )
      );
    } catch (err) {
      return textResult(err instanceof Error ? err.message : String(err), true);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
