import type { ReactNode } from 'react';

export type FormFieldCommonProps = {
  name: string;
  id?: string;
  label?: string;
  required?: boolean;
  className?: string;
  hint?: ReactNode;
  onEdited?: () => void;
};
