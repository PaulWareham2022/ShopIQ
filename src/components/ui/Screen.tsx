import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../constants/colors';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  containerStyle?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  showsVerticalScrollIndicator?: boolean;
  safeArea?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  backgroundColor = colors.white,
  containerStyle,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  safeArea = true,
}) => {
  const baseStyle = [styles.container, { backgroundColor }, containerStyle];

  const content = scrollable ? (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor }]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContainer, contentContainerStyle]}>
      {children}
    </View>
  );

  if (safeArea) {
    return <SafeAreaView style={baseStyle}>{content}</SafeAreaView>;
  }

  return <View style={baseStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContainer: {
    flex: 1,
  },
});
