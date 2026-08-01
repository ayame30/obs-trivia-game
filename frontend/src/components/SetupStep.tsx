import type { ReactNode } from 'react';

interface SetupStepProps {
  step: number;
  title: string;
  summary?: string;
  complete?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function SetupStep({
  step,
  title,
  summary,
  complete,
  open,
  onToggle,
  children,
}: SetupStepProps) {
  return (
    <section
      className={`setup-step${open ? ' setup-step--open' : ''}${complete ? ' setup-step--complete' : ''}`}
    >
      <button type="button" className="setup-step__header" onClick={onToggle} aria-expanded={open}>
        <span className="setup-step__indicator" aria-hidden>
          {complete ? '✓' : step}
        </span>
        <span className="setup-step__titles">
          <span className="setup-step__title">{title}</span>
          {!open && summary ? (
            <span className="setup-step__summary">{summary}</span>
          ) : null}
        </span>
        <span className="setup-step__chevron" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? <div className="setup-step__body">{children}</div> : null}
    </section>
  );
}
