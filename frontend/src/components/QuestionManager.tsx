import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  FaPlus,
  FaPlay,
  FaEdit,
  FaTrash,
  FaPause,
  FaEye,
  FaSave,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
} from 'react-icons/fa';
import {
  GET_QUESTIONS,
  CREATE_QUESTION,
  UPDATE_QUESTION,
  DELETE_QUESTION,
  START_QUESTION,
  STOP_QUESTION,
  PAUSE_COUNTDOWN,
  RESUME_COUNTDOWN,
} from '../graphql/operations';
import type {
  AnswerChoice,
  Question,
  QuestionFormState,
  Round,
  GetQuestionsData,
  StartQuestionMutation,
  StopQuestionMutation,
  PauseCountdownMutation,
  ResumeCountdownMutation,
} from '../types';

const emptyForm: QuestionFormState = {
  text: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  countdownSeconds: 30,
};

const PAGE_SIZE = 10;
const MAX_TEXT_ROWS = 2;

type BankMode = 'edit' | 'stream';

function lineCount(value: string): number {
  if (!value) return 1;
  return value.split('\n').length;
}

function limitLines(value: string, maxLines = MAX_TEXT_ROWS): string {
  const lines = value.split('\n');
  if (lines.length <= maxLines) return value;
  return lines.slice(0, maxLines).join('\n');
}

function blockExtraRows(e: KeyboardEvent<HTMLTextAreaElement>, value: string): void {
  if (e.key === 'Enter' && lineCount(value) >= MAX_TEXT_ROWS) {
    e.preventDefault();
  }
}

interface QuestionManagerProps {
  activeRound: Round | null | undefined;
  onRoundChange?: (round: Round | null) => void;
  onActionError?: (message: string | null) => void;
  embedded?: boolean;
}

export default function QuestionManager({
  activeRound,
  onRoundChange,
  onActionError,
  embedded,
}: QuestionManagerProps) {
  const [form, setForm] = useState<QuestionFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<BankMode>('edit');

  const { data, loading, refetch } = useQuery<GetQuestionsData>(GET_QUESTIONS, {
    variables: { offset, limit: PAGE_SIZE },
  });
  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const setBankMode = (next: BankMode) => {
    setMode(next);
    if (next !== 'edit') closeForm();
  };

  async function goToLastPage() {
    const result = await refetch({ offset: 0, limit: PAGE_SIZE });
    const total = result.data?.questions?.total ?? 0;
    const lastOffset = Math.max(0, Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE);
    setOffset(lastOffset);
    if (lastOffset === 0) return;
    await refetch({ offset: lastOffset, limit: PAGE_SIZE });
  }

  const [createQuestion, { loading: creating }] = useMutation(CREATE_QUESTION, {
    refetchQueries: [{ query: GET_QUESTIONS, variables: { offset: 0, limit: 1 } }],
    onCompleted: () => {
      closeForm();
      void goToLastPage();
    },
  });
  const [updateQuestion, { loading: updating }] = useMutation(UPDATE_QUESTION, {
    onCompleted: () => {
      closeForm();
      void refetch({ offset, limit: PAGE_SIZE });
    },
  });
  const [deleteQuestion] = useMutation(DELETE_QUESTION, {
    refetchQueries: [{ query: GET_QUESTIONS, variables: { offset: 0, limit: 1 } }],
    onCompleted: async () => {
      const result = await refetch({ offset, limit: PAGE_SIZE });
      const page = result.data?.questions;
      if (!page) return;
      if (page.items.length === 0 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE));
      }
    },
  });
  const [startQuestion, { loading: starting }] = useMutation<StartQuestionMutation>(START_QUESTION, {
    onCompleted: (res) => {
      setBankMode('stream');
      onRoundChange?.(res.startQuestion.round);
      onActionError?.(res.startQuestion.warning);
    },
    onError: (err) => onActionError?.(err.message),
  });
  const [stopQuestion, { loading: stopping }] = useMutation<StopQuestionMutation>(STOP_QUESTION, {
    onCompleted: (res) => {
      onActionError?.(null);
      onRoundChange?.(res.stopQuestion);
    },
    onError: (err) => onActionError?.(err.message),
  });
  const [pauseCountdown, { loading: pausing }] = useMutation<PauseCountdownMutation>(PAUSE_COUNTDOWN, {
    onCompleted: (res) => onRoundChange?.(res.pauseCountdown),
    onError: (err) => onActionError?.(err.message),
  });
  const [resumeCountdown, { loading: resuming }] = useMutation<ResumeCountdownMutation>(RESUME_COUNTDOWN, {
    onCompleted: (res) => onRoundChange?.(res.resumeCountdown),
    onError: (err) => onActionError?.(err.message),
  });

  const page = data?.questions;
  const questions: Question[] = page?.items ?? [];
  const total = page?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + questions.length, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const hasActive = activeRound?.status === 'active';
  const countdownPaused = activeRound?.countdownPaused;

  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeForm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = {
      text: limitLines(form.text).trim(),
      optionA: limitLines(form.optionA).trim(),
      optionB: limitLines(form.optionB).trim(),
      optionC: limitLines(form.optionC).trim(),
      optionD: limitLines(form.optionD).trim(),
      correctAnswer: form.correctAnswer,
      countdownSeconds: Number(form.countdownSeconds) || 30,
    };
    if (editingId) {
      updateQuestion({ variables: { id: editingId, input } });
    } else {
      createQuestion({ variables: { input } });
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({
      text: limitLines(q.text),
      optionA: limitLines(q.optionA),
      optionB: limitLines(q.optionB),
      optionC: limitLines(q.optionC),
      optionD: limitLines(q.optionD),
      correctAnswer: q.correctAnswer || 'A',
      countdownSeconds: q.countdownSeconds ?? 30,
    });
    setFormOpen(true);
  };

  const startCopy = (q: Question) => {
    setEditingId(null);
    setForm({
      text: limitLines(q.text),
      optionA: limitLines(q.optionA),
      optionB: limitLines(q.optionB),
      optionC: limitLines(q.optionC),
      optionD: limitLines(q.optionD),
      correctAnswer: q.correctAnswer || 'A',
      countdownSeconds: q.countdownSeconds ?? 30,
    });
    setFormOpen(true);
  };

  const optionKeys = ['optionA', 'optionB', 'optionC', 'optionD'] as const;

  const isEditMode = mode === 'edit';
  const isStreamMode = mode === 'stream';

  const content = (
    <>
      <div className="setup-step__live-header question-manager__header">
        <h2>Question bank</h2>
        <div className="question-manager__header-actions">
          <div className="bank-mode-toggle" role="group" aria-label="Question bank mode">
            <button
              type="button"
              className={`bank-mode-toggle__edit${isEditMode ? ' is-active' : ''}`}
              aria-pressed={isEditMode}
              onClick={() => setBankMode('edit')}
            >
              Edit Mode
            </button>
            <button
              type="button"
              className={`bank-mode-toggle__stream${isStreamMode ? ' is-active' : ''}`}
              aria-pressed={isStreamMode}
              onClick={() => setBankMode('stream')}
            >
              Stream Mode
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="setup-step__hint">Loading questions…</p>
      ) : (
        <>
          {total > 0 ? (
            <div className="pagination">
              <span className="pagination__meta">
                {pageStart}–{pageEnd} of {total}
              </span>
              <div className="pagination__controls">
                <button
                  type="button"
                  className="secondary"
                  disabled={!canPrev}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  <FaChevronLeft aria-hidden />
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={!canNext}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  <FaChevronRight aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {isEditMode ? (
            <div className="question-manager__toolbar">
              <button type="button" className="question-manager__add" onClick={openCreate}>
                <FaPlus aria-hidden />
                Add question
              </button>
            </div>
          ) : null}

          <table className="question-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Question</th>
                <th>Ans</th>
                <th>Timer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="question-table__empty">
                    {isEditMode
                      ? 'No questions yet. Add one to get started.'
                      : 'No questions yet. Switch to Edit mode to add some.'}
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const isActiveQuestion = hasActive && activeRound?.questionId === q.id;
                  return (
                    <tr key={q.id}>
                      <td>{q.id}</td>
                      <td className="question-table__question">
                        <span className="question-table__text" title={q.text}>
                          {q.text}
                        </span>
                      </td>
                      <td>{q.correctAnswer}</td>
                      <td>{q.countdownSeconds ?? 30}s</td>
                      <td>
                        <div className="question-table__actions">
                          {isStreamMode ? (
                            isActiveQuestion ? (
                              <>
                                {countdownPaused ? (
                                  <button
                                    type="button"
                                    className="question-table__btn question-table__btn--start"
                                    aria-label="Resume"
                                    title="Resume"
                                    disabled={resuming}
                                    onClick={() => resumeCountdown()}
                                  >
                                    <FaPlay aria-hidden />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="question-table__btn question-table__btn--pause"
                                    aria-label="Pause"
                                    title="Pause"
                                    disabled={pausing}
                                    onClick={() => pauseCountdown()}
                                  >
                                    <FaPause aria-hidden />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="question-table__btn question-table__btn--reveal"
                                  disabled={stopping}
                                  onClick={() => stopQuestion()}
                                >
                                  <FaEye aria-hidden />
                                  Reveal answer
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="question-table__btn question-table__btn--start"
                                aria-label="Start"
                                title="Start"
                                disabled={hasActive || starting}
                                onClick={() => startQuestion({ variables: { questionId: q.id } })}
                              >
                                <FaPlay aria-hidden />
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                type="button"
                                className="question-table__btn question-table__btn--edit"
                                aria-label="Edit"
                                title="Edit"
                                onClick={() => startEdit(q)}
                              >
                                <FaEdit aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="question-table__btn"
                                aria-label="Copy"
                                title="Copy"
                                onClick={() => startCopy(q)}
                              >
                                <FaCopy aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="question-table__btn question-table__btn--danger"
                                aria-label="Delete"
                                title={
                                  isActiveQuestion
                                    ? 'Cannot delete the active question'
                                    : 'Delete'
                                }
                                disabled={isActiveQuestion}
                                onClick={() => {
                                  if (isActiveQuestion) return;
                                  if (window.confirm('Delete this question?')) {
                                    deleteQuestion({ variables: { id: q.id } });
                                  }
                                }}
                              >
                                <FaTrash aria-hidden />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}

      {isStreamMode && hasActive ? (
        <div className="question-manager__round-actions">
          {countdownPaused ? (
            <button
              type="button"
              className="question-table__btn question-table__btn--start"
              aria-label="Resume"
              title="Resume"
              disabled={resuming}
              onClick={() => resumeCountdown()}
            >
              <FaPlay aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className="question-table__btn question-table__btn--pause"
              aria-label="Pause"
              title="Pause"
              disabled={pausing}
              onClick={() => pauseCountdown()}
            >
              <FaPause aria-hidden />
              Pause
            </button>
          )}
          <button
            type="button"
            className="question-table__btn question-table__btn--reveal"
            disabled={stopping}
            onClick={() => stopQuestion()}
          >
            <FaEye aria-hidden />
            Reveal answer
          </button>
        </div>
      ) : null}

      {formOpen && isEditMode ? (
        <div className="modal-overlay" onClick={closeForm}>
            <form
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="question-form-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
            >
              <div className="modal__header">
                <h3 id="question-form-title">{editingId ? 'Edit question' : 'New question'}</h3>
                <button type="button" className="modal__close secondary" onClick={closeForm} aria-label="Close">
                  <FaTimes aria-hidden />
                </button>
              </div>

              <div className="form-grid modal__body">
                <div>
                  <label>Question</label>
                  <textarea
                    rows={MAX_TEXT_ROWS}
                    className="question-field--2-rows"
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: limitLines(e.target.value) })}
                    onKeyDown={(e) => blockExtraRows(e, form.text)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid-2">
                  {optionKeys.map((key, i) => (
                    <div key={key}>
                      <label>Option {String.fromCharCode(65 + i)}</label>
                      <textarea
                        rows={MAX_TEXT_ROWS}
                        className="question-field--2-rows"
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: limitLines(e.target.value) })}
                        onKeyDown={(e) => blockExtraRows(e, form[key])}
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="grid-2">
                  <div>
                    <label>Correct answer</label>
                    <select
                      value={form.correctAnswer}
                      onChange={(e) =>
                        setForm({ ...form, correctAnswer: e.target.value as AnswerChoice })
                      }
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label>Countdown (seconds)</label>
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={form.countdownSeconds}
                      onChange={(e) => setForm({ ...form, countdownSeconds: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal__footer form-actions">
                <button type="submit" disabled={creating || updating}>
                  {editingId ? <FaSave aria-hidden /> : <FaPlus aria-hidden />}
                  {creating || updating ? 'Saving…' : editingId ? 'Save changes' : 'Add question'}
                </button>
                <button type="button" className="secondary" onClick={closeForm}>
                  <FaTimes aria-hidden />
                  Cancel
                </button>
              </div>
            </form>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="question-manager--embedded">{content}</div>;
  }

  return <div className="card">{content}</div>;
}
