import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  const mockOnKeyPress = jest.fn();
  const mockOnFocus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with basic props', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test placeholder" />
    );

    expect(getByPlaceholderText('Test placeholder')).toBeTruthy();
  });

  it('should render with label and required indicator', () => {
    const { getByText } = render(<Input label="Test Label" required />);

    // The label text includes the asterisk, so we need to check for the full text
    expect(getByText('Test Label *')).toBeTruthy();
  });

  it('should display error message when provided', () => {
    const { getByText } = render(<Input error="Test error message" />);

    expect(getByText('Test error message')).toBeTruthy();
  });

  it('should display help text when provided and no error', () => {
    const { getByText } = render(<Input helpText="Test help text" />);

    expect(getByText('Test help text')).toBeTruthy();
  });

  it('should not display help text when error is present', () => {
    const { queryByText } = render(
      <Input helpText="Test help text" error="Test error" />
    );

    expect(queryByText('Test help text')).toBeNull();
  });

  it('should call onKeyPress when key is pressed', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test"
        fieldName="testField"
        onKeyPress={mockOnKeyPress}
      />
    );

    const input = getByPlaceholderText('Test');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Enter' } });

    expect(mockOnKeyPress).toHaveBeenCalledWith(
      { nativeEvent: { key: 'Enter' } },
      'testField'
    );
  });

  it('should call onFocus when input is focused', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" fieldName="testField" onFocus={mockOnFocus} />
    );

    const input = getByPlaceholderText('Test');
    fireEvent(input, 'focus');

    expect(mockOnFocus).toHaveBeenCalledWith('testField');
  });

  it('should set returnKeyType to next when autoFocusNext is true', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" autoFocusNext={true} />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.returnKeyType).toBe('next');
  });

  it('should set returnKeyType to done when autoFocusNext is false', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" autoFocusNext={false} />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.returnKeyType).toBe('done');
  });

  it('should call onKeyPress with Enter when onSubmitEditing is triggered and autoFocusNext is true', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test"
        fieldName="testField"
        autoFocusNext={true}
        onKeyPress={mockOnKeyPress}
      />
    );

    const input = getByPlaceholderText('Test');
    fireEvent(input, 'submitEditing');

    expect(mockOnKeyPress).toHaveBeenCalledWith(
      { nativeEvent: { key: 'Enter' } },
      'testField'
    );
  });

  it('should not call onKeyPress when onSubmitEditing is triggered and autoFocusNext is false', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test"
        fieldName="testField"
        autoFocusNext={false}
        onKeyPress={mockOnKeyPress}
      />
    );

    const input = getByPlaceholderText('Test');
    fireEvent(input, 'submitEditing');

    expect(mockOnKeyPress).not.toHaveBeenCalled();
  });

  it('should apply custom styles', () => {
    const customContainerStyle = { backgroundColor: 'red' };
    const customInputStyle = { fontSize: 20 };
    const customLabelStyle = { color: 'blue' };

    const { getByPlaceholderText, getByText } = render(
      <Input
        placeholder="Test"
        label="Test Label"
        containerStyle={customContainerStyle}
        inputStyle={customInputStyle}
        labelStyle={customLabelStyle}
      />
    );

    const input = getByPlaceholderText('Test');
    const label = getByText('Test Label');

    expect(input.props.style).toContainEqual(customInputStyle);
    expect(label.props.style).toContainEqual(customLabelStyle);
  });

  it('should handle multiline input', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" multiline numberOfLines={3} />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.multiline).toBe(true);
    expect(input.props.numberOfLines).toBe(3);
  });

  it('should handle keyboard type', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" keyboardType="numeric" />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.keyboardType).toBe('numeric');
  });

  it('should handle autoCapitalize', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" autoCapitalize="characters" />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.autoCapitalize).toBe('characters');
  });

  it('should handle autoCorrect', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" autoCorrect={false} />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.autoCorrect).toBe(false);
  });

  it('should handle maxLength', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" maxLength={10} />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.maxLength).toBe(10);
  });

  it('should handle editable prop', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" editable={false} />
    );

    const input = getByPlaceholderText('Test');
    expect(input.props.editable).toBe(false);
  });

  // Mobile-specific tests
  it('should auto-detect numeric keyboard for price fields', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" fieldName="price" />
    );
    expect(getByPlaceholderText('Test').props.keyboardType).toBe('numeric');
  });

  it('should auto-detect numeric keyboard for amount fields', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" fieldName="amount" />
    );
    expect(getByPlaceholderText('Test').props.keyboardType).toBe('numeric');
  });

  it('should auto-detect email keyboard for URL fields', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" fieldName="url" />
    );
    expect(getByPlaceholderText('Test').props.keyboardType).toBe('email-address');
  });

  it('should disable auto-correction for unit fields', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" fieldName="unit" />
    );
    expect(getByPlaceholderText('Test').props.autoCorrect).toBe(false);
  });

  it('should set character capitalization for currency fields', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" fieldName="currency" />
    );
    expect(getByPlaceholderText('Test').props.autoCapitalize).toBe('characters');
  });

  it('should use custom mobile keyboard type when provided', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" mobileKeyboardType="phone-pad" />
    );
    expect(getByPlaceholderText('Test').props.keyboardType).toBe('phone-pad');
  });
});
