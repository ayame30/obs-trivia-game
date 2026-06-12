import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { UPDATE_SCOREBOARD } from '../graphql/operations';

function clampScore(value) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

function buildDraft(entries) {
  const next = {};
  for (const entry of entries ?? []) {
    next[entry.twitchUserId] = entry.score;
  }
  return next;
}

export default function ScoreboardEditor({ entries, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saveError, setSaveError] = useState(null);

  const [updateScoreboard, { loading: saving }] = useMutation(UPDATE_SCOREBOARD, {
    onCompleted: (res) => {
      setSaveError(null);
      setEditing(false);
      onSaved?.(res.updateScoreboard);
    },
    onError: (err) => setSaveError(err.message),
  });

  useEffect(() => {
    if (!editing) {
      setDraft(buildDraft(entries));
      setSaveError(null);
    }
  }, [entries, editing]);

  const sorted = useMemo(() => {
    return [...(entries ?? [])].sort((a, b) => {
      const scoreA = editing ? (draft[a.twitchUserId] ?? a.score) : a.score;
      const scoreB = editing ? (draft[b.twitchUserId] ?? b.score) : b.score;
      return scoreB - scoreA || a.displayName.localeCompare(b.displayName);
    });
  }, [entries, draft, editing]);

  const dirtyUpdates = useMemo(() => {
    const updates = [];
    for (const entry of entries ?? []) {
      const next = draft[entry.twitchUserId];
      if (next === undefined) continue;
      const score = clampScore(next);
      if (score !== entry.score) {
        updates.push({ twitchUserId: entry.twitchUserId, score });
      }
    }
    return updates;
  }, [entries, draft]);

  const isDirty = dirtyUpdates.length > 0;

  const setScore = (twitchUserId, value) => {
    setDraft((prev) => ({ ...prev, [twitchUserId]: clampScore(value) }));
    setSaveError(null);
  };

  const adjust = (twitchUserId, delta) => {
    setDraft((prev) => ({
      ...prev,
      [twitchUserId]: clampScore((prev[twitchUserId] ?? 0) + delta),
    }));
    setSaveError(null);
  };

  const startEdit = () => {
    setDraft(buildDraft(entries));
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (isDirty && !window.confirm('Discard unsaved score changes?')) return;
    setDraft(buildDraft(entries));
    setSaveError(null);
    setEditing(false);
  };

  const save = () => {
    if (!dirtyUpdates.length) {
      setEditing(false);
      return;
    }
    updateScoreboard({ variables: { updates: dirtyUpdates } });
  };

  if (!entries?.length) {
    return (
      <p style={{ color: 'var(--muted)' }}>
        No scores yet. Correct answers earn +1 when you stop a round.
      </p>
    );
  }

  return (
    <div className="scoreboard-editor">
      <div className="scoreboard-editor-toolbar">
        {!editing ? (
          <button type="button" className="secondary" onClick={startEdit}>
            Edit
          </button>
        ) : (
          <>
            <button type="button" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : `Save${isDirty ? ` (${dirtyUpdates.length})` : ''}`}
            </button>
            <button type="button" className="secondary" disabled={saving} onClick={cancelEdit}>
              Cancel
            </button>
          </>
        )}
      </div>

      <ol className={`scoreboard-list${editing ? ' scoreboard-list--editable' : ''}`}>
        {sorted.map((entry, i) => (
          <li key={entry.twitchUserId}>
            <span className="scoreboard-name">
              {i + 1}. {entry.displayName}
            </span>
            {editing ? (
              <div className="scoreboard-controls">
                <button
                  type="button"
                  className="secondary scoreboard-btn"
                  disabled={saving}
                  onClick={() => adjust(entry.twitchUserId, -1)}
                  aria-label={`Decrease ${entry.displayName} score`}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  className="scoreboard-input"
                  value={draft[entry.twitchUserId] ?? entry.score}
                  disabled={saving}
                  onChange={(e) => setScore(entry.twitchUserId, e.target.value)}
                />
                <button
                  type="button"
                  className="secondary scoreboard-btn"
                  disabled={saving}
                  onClick={() => adjust(entry.twitchUserId, 1)}
                  aria-label={`Increase ${entry.displayName} score`}
                >
                  +
                </button>
                <button
                  type="button"
                  className="secondary scoreboard-btn"
                  disabled={saving}
                  onClick={() => adjust(entry.twitchUserId, 5)}
                >
                  +5
                </button>
              </div>
            ) : (
              <strong>{entry.score}</strong>
            )}
          </li>
        ))}
      </ol>

      {saveError && <p className="scoreboard-error">{saveError}</p>}
    </div>
  );
}
