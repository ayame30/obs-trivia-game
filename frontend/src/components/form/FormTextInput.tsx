import { memo } from 'react';
import { Field, type FieldProps } from 'formik';
import type { FormFieldCommonProps } from './types';

export const FormTextInput = memo(function FormTextInput({
  name,
  id,
  label,
  required,
  className,
  hint,
  type = 'text',
  min,
  max,
  step,
  onEdited,
}: FormFieldCommonProps & {
  type?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const inputId = id ?? name;
  return (
    <div>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <Field name={name}>
        {({ field, form }: FieldProps<string | number>) => (
          <input
            id={inputId}
            name={field.name}
            type={type}
            min={min}
            max={max}
            step={step}
            className={className}
            required={required}
            value={field.value ?? ''}
            onBlur={field.onBlur}
            onChange={(e) => {
              void form.setFieldValue(field.name, e.target.value);
              onEdited?.();
            }}
          />
        )}
      </Field>
      {hint}
    </div>
  );
});
