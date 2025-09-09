const React = require('react');
const { View, Text, TextInput, TouchableOpacity, ActivityIndicator } = require('react-native');

const Button = ({ title, onPress, disabled, loading, style, children, ...props }) => (
  React.createElement(TouchableOpacity, { onPress, disabled: disabled || loading, style, ...props },
    loading ? React.createElement(ActivityIndicator) : React.createElement(Text, null, children || title || '')
  )
);

const PaperTextInput = ({ label, value, onChangeText, onBlur, onFocus, onKeyPress, placeholder, _mode, _error, keyboardType, autoCapitalize, autoCorrect, multiline, numberOfLines, maxLength, editable, secureTextEntry, testID, style, _contentStyle, _outlineStyle, _theme, ...props }) => (
  React.createElement(View, null,
    label && React.createElement(Text, null, label),
    React.createElement(TextInput, {
      value,
      onChangeText,
      onBlur,
      onFocus,
      onKeyPress,
      placeholder,
      keyboardType,
      autoCapitalize,
      autoCorrect,
      multiline,
      numberOfLines,
      maxLength,
      editable,
      secureTextEntry,
      testID,
      style,
      ...props
    })
  )
);

const HelperText = ({ _type, visible, children, style }) => {
  if (!visible) return null;
  return React.createElement(Text, { style }, children);
};

const Switch = ({ value, onValueChange, testID, ...props }) => (
  React.createElement(TouchableOpacity, { onPress: () => onValueChange(!value), testID, ...props },
    React.createElement(Text, null, value ? 'ON' : 'OFF')
  )
);

// eslint-disable-next-line no-undef
module.exports = {
  Button,
  TextInput: PaperTextInput,
  HelperText,
  Switch,
  ActivityIndicator
};
