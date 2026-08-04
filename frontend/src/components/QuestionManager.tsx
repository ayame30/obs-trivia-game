import { memo, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Formik } from 'formik';
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
import { FormSelect, FormTextArea, FormTextInput } from './form';
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
const ANSWER_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
];

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

function questionToForm(q: Question): QuestionFormState {
  return {
    text: limitLines(q.text),
    optionA: limitLines(q.optionA),
    optionB: limitLines(q.optionB),
    optionC: limitLines(q.optionC),
    optionD: limitLines(q.optionD),
    correctAnswer: q.correctAnswer || 'A',
    countdownSeconds: q.countdownSeconds ?? 30,
  };
}

const QuestionFormModal = memo(function QuestionFormModal({
  editingId,
  initialValues,
  creating,
  updating,
  onClose,
  onSubmit,
}: {
  editingId: string | null;
  initialValues: QuestionFormState;
  creating: boolean;
  updating: boolean;
  onClose: () => void;
  onSubmit: (values: QuestionFormState) => void;
}) {
  const { t } = useTranslation();
  const optionKeys = ['optionA', 'optionB', 'optionC', 'optionD'] as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Formik<QuestionFormState>
        initialValues={initialValues}
        enableReinitialize
        onSubmit={onSubmit}
      >
        <Form
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-form-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal__header">
            <h3 id="question-form-title">
              {editingId ? t('questions.editTitle') : t('questions.createTitle')}
            </h3>
            <button type="button" className="modal__close secondary" onClick={onClose} aria-label={t('questions.close')}>
              <FaTimes aria-hidden />
            </button>
          </div>

          <div className="form-grid modal__body">
            <FormTextArea
              name="text"
              label={t('questions.question')}
              rows={MAX_TEXT_ROWS}
              className="question-field--2-rows"
              required
              autoFocus
              transformValue={limitLines}
              onKeyDown={blockExtraRows}
            />
            <div className="grid-2">
              {optionKeys.map((key, i) => (
                <FormTextArea
                  key={key}
                  name={key}
                  label={t('questions.option', { letter: String.fromCharCode(65 + i) })}
                  rows={MAX_TEXT_ROWS}
                  className="question-field--2-rows"
                  required
                  transformValue={limitLines}
                  onKeyDown={blockExtraRows}
                />
              ))}
            </div>
            <div className="grid-2">
              <FormSelect
                name="correctAnswer"
                label={t('questions.correctAnswer')}
                options={ANSWER_OPTIONS}
              />
              <FormTextInput
                name="countdownSeconds"
                label={t('questions.countdownSeconds')}
                type="number"
                min={5}
                max={600}
                required
              />
            </div>
          </div>

          <div className="modal__footer form-actions">
            <button type="submit" disabled={creating || updating}>
              {editingId ? <FaSave aria-hidden /> : <FaPlus aria-hidden />}
              {creating || updating
                ? t('common.saving')
                : editingId
                  ? t('questions.saveChanges')
                  : t('questions.add')}
            </button>
            <button type="button" className="secondary" onClick={onClose}>
              <FaTimes aria-hidden />
              {t('questions.cancel')}
            </button>
          </div>
        </Form>
      </Formik>
    </div>
  );
});

interface QuestionManagerProps {
  activeRound: Round | null | undefined;
  onRoundChange?: (round: Round | null) => void;
  onActionError?: (message: string | null) => void;
  embedded?: boolean;
  /** Lock to Stream mode (no Edit / mode toggle). */
  streamOnly?: boolean;
  /** Extra controls aligned with the Question bank header. */
  headerActions?: ReactNode;
}

export default function QuestionManager({
  activeRound,
  onRoundChange,
  onActionError,
  embedded,
  streamOnly = false,
  headerActions,
}: QuestionManagerProps) {
  const [draft, setDraft] = useState<QuestionFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<BankMode>(streamOnly ? 'stream' : 'edit');

  const { data, loading, refetch } = useQuery<GetQuestionsData>(GET_QUESTIONS, {
    variables: { offset, limit: PAGE_SIZE },
  });
  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyForm);
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

  const submitQuestion = (values: QuestionFormState) => {
    const input = {
      text: limitLines(values.text).trim(),
      optionA: limitLines(values.optionA).trim(),
      optionB: limitLines(values.optionB).trim(),
      optionC: limitLines(values.optionC).trim(),
      optionD: limitLines(values.optionD).trim(),
      correctAnswer: values.correctAnswer as AnswerChoice,
      countdownSeconds: Number(values.countdownSeconds) || 30,
    };
    if (editingId) {
      void updateQuestion({ variables: { id: editingId, input } });
    } else {
      void createQuestion({ variables: { input } });
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyForm);
    setFormOpen(true);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setDraft(questionToForm(q));
    setFormOpen(true);
  };

  const startCopy = (q: Question) => {
    setEditingId(null);
    setDraft(questionToForm(q));
    setFormOpen(true);
  };

  const isEditMode = mode === 'edit';
  const isStreamMode = mode === 'stream';

  const content = (
    <>
      <div className="setup-step__live-header question-manager__header">
        <h2>{t('questions.bank')}</h2>
        <div className="question-manager__header-actions">
          {headerActions}
          {!streamOnly ? (
            <div className="bank-mode-toggle" role="group" aria-label={t('questions.bankMode')}>
              <button
                type="button"
                className={`bank-mode-toggle__edit${isEditMode ? ' is-active' : ''}`}
                aria-pressed={isEditMode}
                onClick={() => setBankMode('edit')}
              >
                {t('questions.editMode')}
              </button>
              <button
                type="button"
                className={`bank-mode-toggle__stream${isStreamMode ? ' is-active' : ''}`}
                aria-pressed={isStreamMode}
                onClick={() => setBankMode('stream')}
              >
                {t('questions.streamMode')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="setup-step__hint">{t('questions.loading')}</p>
      ) : (
        <>
          {total > 0 ? (
            <div className="pagination">
              <span className="pagination__meta">
                {t('questions.pagination', { start: pageStart, end: pageEnd, total })}
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
                {t('questions.add')}
              </button>
            </div>
          ) : null}

          {streamOnly ? (
            <div className="question-grid" role="table" aria-label={t('questions.bank')}>
              <div className="question-grid__row question-grid__row--head" role="row">
                <span role="columnheader">{t('questions.colId')}</span>
                <span role="columnheader">{t('questions.colQuestion')}</span>
                <span role="columnheader">{t('questions.colAns')}</span>
                <span role="columnheader">{t('questions.colTimer')}</span>
                <span role="columnheader">{t('questions.colActions')}</span>
              </div>
              {questions.length === 0 ? (
                <p className="question-grid__empty">{t('questions.emptyStream')}</p>
              ) : (
                questions.map((q) => {
                  const isActiveQuestion = hasActive && activeRound?.questionId === q.id;
                  return (
                    <div key={q.id} className="question-grid__row" role="row">
                      <span className="question-grid__id" role="cell">
                        {q.id}
                      </span>
                      <span className="question-grid__question" role="cell" title={q.text}>
                        {q.text}
                      </span>
                      <span className="question-grid__ans" role="cell">
                        {q.correctAnswer}
                      </span>
                      <span className="question-grid__timer" role="cell">
                        {q.countdownSeconds ?? 30}s
                      </span>
                      <div className="question-grid__actions question-table__actions" role="cell">
                        {isActiveQuestion ? (
                          <>
                            {countdownPaused ? (
                              <button
                                type="button"
                                className="question-table__btn question-table__btn--start"
                                aria-label={t('questions.resume')}
                                title={t('questions.resume')}
                                disabled={resuming}
                                onClick={() => resumeCountdown()}
                              >
                                <FaPlay aria-hidden />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="question-table__btn question-table__btn--pause"
                                aria-label={t('questions.pause')}
                                title={t('questions.pause')}
                                disabled={pausing}
                                onClick={() => pauseCountdown()}
                              >
                                <FaPause aria-hidden />
                              </button>
                            )}
                            <button
                              type="button"
                              className="question-table__btn question-table__btn--reveal"
                              aria-label={t('questions.reveal')}
                              title={t('questions.reveal')}
                              disabled={stopping}
                              onClick={() => stopQuestion()}
                            >
                              <FaEye aria-hidden />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="question-table__btn question-table__btn--start"
                            aria-label={t('questions.start')}
                            title={t('questions.start')}
                            disabled={hasActive || starting}
                            onClick={() => startQuestion({ variables: { questionId: q.id } })}
                          >
                            <FaPlay aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <table className="question-table">
              <thead>
                <tr>
                  <th>{t('questions.colId')}</th>
                  <th>{t('questions.colQuestion')}</th>
                  <th>{t('questions.colAns')}</th>
                  <th>{t('questions.colTimer')}</th>
                  <th>{t('questions.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="question-table__empty">
                      {isEditMode ? t('questions.emptyEdit') : t('questions.emptyStream')}
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
                                      aria-label={t('questions.resume')}
                                      title={t('questions.resume')}
                                      disabled={resuming}
                                      onClick={() => resumeCountdown()}
                                    >
                                      <FaPlay aria-hidden />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="question-table__btn question-table__btn--pause"
                                      aria-label={t('questions.pause')}
                                      title={t('questions.pause')}
                                      disabled={pausing}
                                      onClick={() => pauseCountdown()}
                                    >
                                      <FaPause aria-hidden />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="question-table__btn question-table__btn--reveal"
                                    aria-label={t('questions.reveal')}
                                    title={t('questions.reveal')}
                                    disabled={stopping}
                                    onClick={() => stopQuestion()}
                                  >
                                    <FaEye aria-hidden />
                                    {t('questions.reveal')}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="question-table__btn question-table__btn--start"
                                  aria-label={t('questions.start')}
                                  title={t('questions.start')}
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
                                  aria-label={t('questions.edit')}
                                  title={t('questions.edit')}
                                  onClick={() => startEdit(q)}
                                >
                                  <FaEdit aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="question-table__btn"
                                  aria-label={t('questions.copy')}
                                  title={t('questions.copy')}
                                  onClick={() => startCopy(q)}
                                >
                                  <FaCopy aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="question-table__btn question-table__btn--danger"
                                  aria-label={t('questions.delete')}
                                  title={
                                    isActiveQuestion
                                      ? t('questions.cannotDeleteActive')
                                      : t('questions.delete')
                                  }
                                  disabled={isActiveQuestion}
                                  onClick={() => {
                                    if (isActiveQuestion) return;
                                    if (window.confirm(t('questions.deleteConfirm'))) {
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
          )}
        </>
      )}

      {isStreamMode && hasActive ? (
        <div className="question-manager__round-actions">
          {countdownPaused ? (
            <button
              type="button"
              className="question-table__btn question-table__btn--start"
              aria-label={t("questions.resume")}
              title={t("questions.resume")}
              disabled={resuming}
              onClick={() => resumeCountdown()}
            >
              <FaPlay aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className="question-table__btn question-table__btn--pause"
              aria-label={t("questions.pause")}
              title={t("questions.pause")}
              disabled={pausing}
              onClick={() => pauseCountdown()}
            >
              <FaPause aria-hidden />
              {t('questions.pause')}
            </button>
          )}
          <button
            type="button"
            className="question-table__btn question-table__btn--reveal"
            aria-label={t('questions.reveal')}
            title={t('questions.reveal')}
            disabled={stopping}
            onClick={() => stopQuestion()}
          >
            <FaEye aria-hidden />
            {streamOnly ? null : t('questions.reveal')}
          </button>
        </div>
      ) : null}

      {formOpen && isEditMode ? (
        <QuestionFormModal
          key={editingId ?? 'new'}
          editingId={editingId}
          initialValues={draft}
          creating={creating}
          updating={updating}
          onClose={closeForm}
          onSubmit={submitQuestion}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="question-manager--embedded">{content}</div>;
  }

  return <div className="card">{content}</div>;
}
