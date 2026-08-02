import { memo, type KeyboardEvent } from 'react';
import { Field, type FieldProps } from 'formik';
import type { FormFieldCommonProps } from './types';

export const FormTextArea = memo(function FormTextArea({
  name,
  id,
  label,
  required,
  className,
  hint,
  rows = 3,
  spellCheck,
  placeholder,
  autoFocus,
  transformValue,
  onKeyDown,
  onEdited,
}: FormFieldCommonProps & {
  rows?: number;
  spellCheck?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  transformValue?: (value: string) => string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>, value: string) => void;
}) {
  const inputId = id ?? name;
  return (
    <div>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <Field name={name}>
        {({ field, form }: FieldProps<string>) => {
          const value = field.value ?? '';
          return (
            <textarea
              id={inputId}
              name={field.name}
              rows={rows}
              className={className}
              required={required}
              spellCheck={spellCheck}
              placeholder={placeholder}
              autoFocus={autoFocus}
              value={value}
              onBlur={field.onBlur}
              onChange={(e) => {
                const next = transformValue ? transformValue(e.target.value) : e.target.value;
                void form.setFieldValue(field.name, next);
                onEdited?.();
              }}
              onKeyDown={(e) => onKeyDown?.(e, value)}
            />
          );
        }}
      </Field>
      {hint}
    </div>
  );
});
