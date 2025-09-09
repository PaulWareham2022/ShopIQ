import { useRef, useCallback } from 'react';

export interface FormFocusOptions {
  fieldOrder: string[];
  onSubmit?: () => void;
  onCancel?: () => void;
}

/**
 * Simplified hook for form navigation - relies on native keyboard behavior
 * Focuses on reliability over complex UX features
 */
export const useFormFocus = (options: FormFocusOptions) => {
  const { fieldOrder, onSubmit } = options;
  const currentFieldIndex = useRef<number>(0);

  const focusNext = useCallback(() => {
    const nextIndex = currentFieldIndex.current + 1;
    if (nextIndex < fieldOrder.length) {
      currentFieldIndex.current = nextIndex;
      // Let the native keyboard behavior handle focus
      // This is more reliable than programmatic focus
    } else if (onSubmit) {
      // If we're at the last field, submit the form
      onSubmit();
    }
  }, [fieldOrder, onSubmit]);

  const handleFieldFocus = useCallback((fieldName: string) => {
    const fieldIndex = fieldOrder.indexOf(fieldName);
    if (fieldIndex !== -1) {
      currentFieldIndex.current = fieldIndex;
    }
  }, [fieldOrder]);

  // Handle submit editing (when user presses Next/Done on keyboard)
  const handleSubmitEditing = useCallback(() => {
    focusNext();
  }, [focusNext]);

  const submitForm = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

  return {
    handleFieldFocus,
    handleSubmitEditing,
    focusNext,
    submitForm,
  };
};

// Note: HOC removed due to TypeScript complexity in this context
// The useFormFocus hook can be used directly in components
