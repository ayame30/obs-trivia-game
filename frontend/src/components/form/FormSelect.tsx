import { memo } from 'react';
import { Field, type FieldProps } from 'formik';
import type { FormFieldCommonProps } from './types';

export const FormSelect = memo(function FormSelect({
  name,
  id,
  label,
  required,
  options,
  onEdited,
}: FormFieldCommonProps & {
  options: Array<{ value: string; label: string }>;
}) {
  const inputId = id ?? name;
  return (
    <div>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <Field name={name}>
        {({ field, form }: FieldProps<string>) => (
          <select
            id={inputId}
            name={field.name}
            required={required}
            value={field.value ?? ''}
            onBlur={field.onBlur}
            onChange={(e) => {
              void form.setFieldValue(field.name, e.target.value);
              onEdited?.();
            }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );
});
