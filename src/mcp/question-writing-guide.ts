/** Writing guide for MCP question create/update tools. */
export const QUESTION_WRITING_GUIDE = `# Question & answer text layout (OBS overlay)

Overlay text auto-enlarges to fill a fixed box (\`ResizeText\`). You may use **at most 2 lines** (\`\\n\`). Decide whether a line break improves fit/readability.

## Text boxes

| Field | Box size | Max lines |
|-------|----------|-----------|
| Question (\`text\`) | **768px × 80px** | 2 |
| Each answer (\`optionA\`–\`D\`) | **364px × 80px** | 2 |

## How sizing works

- Font size scales up (roughly 10px–96px) until the text fills the box without overflow.
- \`white-space: pre-wrap\` — your \`\\n\` is an intentional line break.
- Prefer **fewer, larger characters** over cramming a long single line that shrinks to a tiny font.

## When to insert a line break

- **Use 1 line** if the phrase is short and stays large in the box.
- **Use 2 lines** when a single line would force a small font, or a natural phrase break exists (clause, “vs”, number + unit, Chinese/English mix).
- Put the break at a **natural pause**, not mid-word.
- Do **not** use more than 2 lines (UI and forms clamp to 2).

## Examples

Good question (2 lines):
\`\`\`
Which planet is known
as the Red Planet?
\`\`\`

Good short answer (1 line):
\`\`\`
Mars
\`\`\`

Good longer answer (2 lines):
\`\`\`
Mount Everest
(Nepal / China)
\`\`\`
`;
