import { memo } from 'react';
import { Field, type FieldProps } from 'formik';
import type { FormFieldCommonProps } from './types';

export const FormCheckbox = memo(function FormCheckbox({
  name,
  id,
  label,
  className = 'settings-toggle',
  onEdited,
}: FormFieldCommonProps) {
  const inputId = id ?? name;
  return (
    <label className={className} htmlFor={inputId}>
      <Field name={name}>
        {({ field, form }: FieldProps<boolean>) => (
          <input
            id={inputId}
            name={field.name}
            type="checkbox"
            checked={Boolean(field.value)}
            onBlur={field.onBlur}
            onChange={(e) => {
              void form.setFieldValue(field.name, e.target.checked);
              onEdited?.();
            }}
          />
        )}
      </Field>
      {label}
    </label>
  );
});
