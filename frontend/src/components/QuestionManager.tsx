import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
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
import type { AnswerChoice, Question, QuestionFormState, Round, GetQuestionsData, StartQuestionMutation, StopQuestionMutation, PauseCountdownMutation, ResumeCountdownMutation } from '../types';

const emptyForm: QuestionFormState = {
  text: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  countdownSeconds: 30,
};

const MAX_TEXT_ROWS = 2;

function lineCount(value: string): number {
  if (!value) return 1;
  return value.split('\n').length;
}

function limitLines(value: string, maxLines = MAX_TEXT_ROWS): string {
  const lines = value.split('\n');
  if (lines.length <= maxLines) return value;
  return lines.slice(0, maxLines).join('\n');
}

function blockExtraRows(
  e: KeyboardEvent<HTMLTextAreaElement>,
  value: string
): void {
  if (e.key === 'Enter' && lineCount(value) >= MAX_TEXT_ROWS) {
    e.preventDefault();
  }
}

interface QuestionManagerProps {
  activeRound: Round | null | undefined;
  onRoundChange?: (round: Round | null) => void;
  embedded?: boolean;
}

export default function QuestionManager({ activeRound, onRoundChange, embedded }: QuestionManagerProps) {
  const [form, setForm] = useState<QuestionFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<GetQuestionsData>(GET_QUESTIONS);
  const [createQuestion, { loading: creating }] = useMutation(CREATE_QUESTION, {
    onCompleted: () => {
      setForm(emptyForm);
      refetch();
    },
  });
  const [updateQuestion, { loading: updating }] = useMutation(UPDATE_QUESTION, {
    onCompleted: () => {
      setForm(emptyForm);
      setEditingId(null);
      refetch();
    },
  });
  const [deleteQuestion] = useMutation(DELETE_QUESTION, { onCompleted: () => refetch() });
  const [startQuestion, { loading: starting }] = useMutation<StartQuestionMutation>(START_QUESTION, {
    onCompleted: (res) => onRoundChange?.(res.startQuestion),
  });
  const [stopQuestion, { loading: stopping }] = useMutation<StopQuestionMutation>(STOP_QUESTION, {
    onCompleted: (res) => onRoundChange?.(res.stopQuestion),
  });
  const [pauseCountdown, { loading: pausing }] = useMutation<PauseCountdownMutation>(PAUSE_COUNTDOWN, {
    onCompleted: (res) => onRoundChange?.(res.pauseCountdown),
  });
  const [resumeCountdown, { loading: resuming }] = useMutation<ResumeCountdownMutation>(RESUME_COUNTDOWN, {
    onCompleted: (res) => onRoundChange?.(res.resumeCountdown),
  });

  const questions: Question[] = data?.questions ?? [];
  const hasActive = activeRound?.status === 'active';
  const countdownPaused = activeRound?.countdownPaused;

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
  };

  const optionKeys = ['optionA', 'optionB', 'optionC', 'optionD'] as const;

  const content = (
    <>
      {!embedded ? <h2>Question bank</h2> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div>
          <label>Question</label>
          <textarea
            rows={MAX_TEXT_ROWS}
            className="question-field--2-rows"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: limitLines(e.target.value) })}
            onKeyDown={(e) => blockExtraRows(e, form.text)}
            required
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
                onChange={(e) =>
                  setForm({ ...form, [key]: limitLines(e.target.value) })
                }
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
        <div className="form-actions">
          <button type="submit" disabled={creating || updating}>
            {editingId ? 'Save changes' : 'Add question'}
          </button>
          {editingId && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading questions…</p>
      ) : (
        <table className="question-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Question</th>
              <th>Answer</th>
              <th>Timer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td>{q.id}</td>
                <td>{q.text}</td>
                <td>{q.correctAnswer}</td>
                <td>{q.countdownSeconds ?? 30}s</td>
                <td>
                  <div className="form-actions" style={{ flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={hasActive || starting}
                      onClick={() => startQuestion({ variables: { questionId: q.id } })}
                    >
                      Start
                    </button>
                    <button type="button" className="secondary" onClick={() => startEdit(q)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        if (window.confirm('Delete this question?')) {
                          deleteQuestion({ variables: { id: q.id } });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasActive && (
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="secondary"
            disabled={pausing || countdownPaused}
            onClick={() => pauseCountdown()}
          >
            Pause
          </button>
          <button
            type="button"
            className="secondary"
            disabled={resuming || !countdownPaused}
            onClick={() => resumeCountdown()}
          >
            Resume
          </button>
          <button type="button" className="danger" disabled={stopping} onClick={() => stopQuestion()}>
            Stop round & reveal answer
          </button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="question-manager--embedded">{content}</div>;
  }

  return <div className="card">{content}</div>;
}
