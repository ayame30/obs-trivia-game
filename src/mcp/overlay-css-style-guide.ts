/** Style guide returned by get_overlay_style_guide MCP tool. */
export const OVERLAY_CSS_STYLE_GUIDE = `# Overlay CSS style guide (OBS)

Use this when editing Obs Trivia game overlay custom CSS via MCP tools.
Overrides apply to both \`/overlay\` and \`/scoreboard-overlay\` (injected as a \`<style>\` tag).
Source of truth for base overlay styles: \`frontend/src/styles/overlay.css\`.

## Rules

- CSS only. No HTML, JavaScript, or \`@import\`.
- Prefer overriding selectors listed below — do not restyle dashboard chrome (\`.layout\`, \`.setup-wizard\`, \`.question-table\`, etc.).
- Prefer full-replacement CSS documents (what \`set_overlay_css\` stores).
- Keep OBS backgrounds transparent unless the user asks otherwise.

## Primary selectors

### Shell
- \`.overlay-page\` — full-page OBS container
- \`.overlay-card\` — main card wrapper
- \`.overlay-card.show\` / \`.overlay-card.hide\`
- \`.overlay-idle\`

### Live trivia round
- \`.live-round-panel\`
- \`.live-round-panel__stage\`
- \`.live-round-panel__question\`
- \`.live-round-panel__question_header\`
- \`.live-round-panel__question_count_text\`
- \`.live-round-panel__question_text\`
- \`.live-round-panel__options\`
- \`.live-round-panel__option\`
- \`.live-round-panel__option--correct\`
- \`.live-round-panel__option_label\`
- \`.live-round-panel__vote-count\`
- \`.live-round-panel__countdown-slot\`

### Countdown
- \`.countdown-display\`
- \`.countdown-display--overlay\`
- \`.countdown-display--paused\`
- \`.countdown-display--urgent\`
- \`.countdown-label\`
- \`.countdown-value\`

### Scoreboard overlay
- \`.scoreboard-list\`
- \`.scoreboard-list li\`
- \`.scoreboard-name\`
- \`.scoreboard-score\`

## Example

\`\`\`css
.overlay-card {
  font-size: 1.15rem;
}

.live-round-panel__question_text {
  color: #fff;
}

.countdown-display--overlay .countdown-value {
  color: #f5c14a;
}
\`\`\`
`;

export function sanitizeOverlayCss(css: string): string {
  return String(css ?? '')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '/* blocked expression( */')
    .replace(/javascript\s*:/gi, '/* blocked javascript: */');
}
