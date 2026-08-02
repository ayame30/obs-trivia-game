import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client/react';
import { FaSyncAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { UPDATE_SCOREBOARD } from '../graphql/operations';
import { useAppSettings } from '../hooks/useAppSettings';
import type { ScoreboardEntry, UpdateScoreboardMutation } from '../types';

const RESET_CONFIRM_WORD = 'confirm';

function clampScore(value: string | number): number {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

function buildDraft(entries: ScoreboardEntry[] | null | undefined): Record<string, number> {
  const next: Record<string, number> = {};
  for (const entry of entries ?? []) {
    next[entry.twitchUserId] = entry.score;
  }
  return next;
}

interface ScoreboardEditorProps {
  entries: ScoreboardEntry[];
  onSaved?: (entries: ScoreboardEntry[]) => void;
  onReset?: () => void;
  resetting?: boolean;
}

export default function ScoreboardEditor({
  entries,
  onSaved,
  onReset,
  resetting = false,
}: ScoreboardEditorProps) {
  const { t } = useTranslation();
  const { scoreMultiplier } = useAppSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const [updateScoreboard, { loading: saving }] = useMutation<UpdateScoreboardMutation>(UPDATE_SCOREBOARD, {
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

  useEffect(() => {
    if (!resetOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeResetConfirm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetOpen]);

  const sorted = useMemo(() => {
    return [...(entries ?? [])].sort((a, b) => {
      const scoreA = editing ? (draft[a.twitchUserId] ?? a.score) : a.score;
      const scoreB = editing ? (draft[b.twitchUserId] ?? b.score) : b.score;
      return scoreB - scoreA || a.displayName.localeCompare(b.displayName);
    });
  }, [entries, draft, editing]);

  const dirtyUpdates = useMemo(() => {
    const updates: Array<{ twitchUserId: string; score: number }> = [];
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
  const canConfirmReset = resetConfirmText.trim().toLowerCase() === RESET_CONFIRM_WORD;

  const setScore = (twitchUserId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [twitchUserId]: clampScore(value) }));
    setSaveError(null);
  };

  const adjust = (twitchUserId: string, delta: number) => {
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
    if (isDirty && !window.confirm(t('scoreboard.discardConfirm'))) return;
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

  const openResetConfirm = () => {
    setResetConfirmText('');
    setResetOpen(true);
  };

  const closeResetConfirm = () => {
    setResetOpen(false);
    setResetConfirmText('');
  };

  const submitReset = (e: FormEvent) => {
    e.preventDefault();
    if (!canConfirmReset || resetting) return;
    closeResetConfirm();
    onReset?.();
  };

  return (
    <div className="scoreboard-editor">
      <div className="setup-step__live-header">
        <h3>{t('scoreboard.title')}</h3>
        <div className="scoreboard-editor-toolbar">
          {onReset ? (
            <button
              type="button"
              className="secondary"
              disabled={resetting || editing || saving}
              onClick={openResetConfirm}
            >
              <FaSyncAlt aria-hidden />
              {t('scoreboard.reset')}
            </button>
          ) : null}
          {!editing ? (
            <button type="button" className="secondary" onClick={startEdit} disabled={!entries?.length}>
              <FaEdit aria-hidden />
              {t('scoreboard.edit')}
            </button>
          ) : (
            <>
              <button type="button" disabled={saving} onClick={save}>
                <FaSave aria-hidden />
                {saving
                  ? t('common.saving')
                  : isDirty
                    ? t('scoreboard.saveCount', { count: dirtyUpdates.length })
                    : t('scoreboard.save')}
              </button>
              <button type="button" className="secondary" disabled={saving} onClick={cancelEdit}>
                <FaTimes aria-hidden />
                {t('scoreboard.cancel')}
              </button>
            </>
          )}
        </div>
      </div>

      {!entries?.length ? (
        <p className="setup-step__hint">{t('scoreboard.empty')}</p>
      ) : (
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
                    aria-label={t('scoreboard.decreaseScore', { name: entry.displayName })}
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
                    aria-label={t('scoreboard.increaseScore', { name: entry.displayName })}
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
                <strong>{entry.score * scoreMultiplier}</strong>
              )}
            </li>
          ))}
        </ol>
      )}

      {saveError && <p className="scoreboard-error">{saveError}</p>}

      {resetOpen ? (
        <div className="modal-overlay" onClick={closeResetConfirm}>
          <div
            className="modal modal--sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scoreboard-reset-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h3 id="scoreboard-reset-title">{t('scoreboard.resetTitle')}</h3>
              <button
                type="button"
                className="modal__close secondary"
                onClick={closeResetConfirm}
                aria-label={t('questions.close')}
              >
                <FaTimes aria-hidden />
              </button>
            </div>
            <form className="modal__body" onSubmit={submitReset}>
              <p className="confirm-modal__copy">
                <Trans
                  i18nKey="scoreboard.resetBody"
                  values={{ word: RESET_CONFIRM_WORD }}
                  components={{ strong: <strong /> }}
                />
              </p>
              <label className="confirm-modal__label" htmlFor="scoreboard-reset-confirm">
                {t('scoreboard.confirmation')}
              </label>
              <input
                id="scoreboard-reset-confirm"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={RESET_CONFIRM_WORD}
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                disabled={resetting}
              />
              <div className="form-actions confirm-modal__actions">
                <button type="button" className="secondary" onClick={closeResetConfirm} disabled={resetting}>
                  {t('scoreboard.cancel')}
                </button>
                <button type="submit" disabled={!canConfirmReset || resetting}>
                  {resetting ? t('scoreboard.resetting') : t('scoreboard.resetScores')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
