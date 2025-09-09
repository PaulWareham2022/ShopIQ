import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

export interface ItemCardProps {
  icon?: string;
  title: string;
  subtitle?: string | React.ReactElement;
  chips?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'warning' | 'success';
  }>;
  notes?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  notesStyle?: TextStyle;
  showChevron?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  icon = '📦',
  title,
  subtitle,
  chips = [],
  notes,
  onPress,
  onLongPress,
  containerStyle,
  titleStyle,
  subtitleStyle,
  notesStyle,
  showChevron = true,
}) => {
  const content = (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>

        {(subtitle || chips.length > 0) && (
          <View style={styles.metaRow}>
            {subtitle && (
              typeof subtitle === 'string' ? (
                <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
              ) : (
                <View style={subtitleStyle}>{subtitle}</View>
              )
            )}

            {chips.map((chip, index) => {
              const chipVariant = chip.variant || 'primary';
              let chipStyle: ViewStyle[] = [styles.chip];
              let chipTextStyle: TextStyle[] = [styles.chipText];

              if (chipVariant === 'primary') {
                chipStyle = [styles.chip, styles.chipPrimary];
                chipTextStyle = [styles.chipText, styles.chipTextPrimary];
              } else if (chipVariant === 'secondary') {
                chipStyle = [styles.chip, styles.chipSecondary];
                chipTextStyle = [styles.chipText, styles.chipTextSecondary];
              } else if (chipVariant === 'warning') {
                chipStyle = [styles.chip, styles.chipWarning];
                chipTextStyle = [styles.chipText, styles.chipTextWarning];
              } else if (chipVariant === 'success') {
                chipStyle = [styles.chip, styles.chipSuccess];
                chipTextStyle = [styles.chipText, styles.chipTextSuccess];
              }

              return (
                <View key={index} style={chipStyle}>
                  <Text style={chipTextStyle}>{chip.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {notes && (
          <Text style={[styles.notes, notesStyle]} numberOfLines={2}>
            {notes}
          </Text>
        )}
      </View>

      {showChevron && (
        <View style={styles.actions}>
          <Text style={styles.chevron}>›</Text>
        </View>
      )}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        style={[styles.container, containerStyle]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.container, containerStyle]}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 14,
    color: colors.grayText,
    marginRight: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  chipPrimary: {
    backgroundColor: '#E5F3FF',
  },
  chipSecondary: {
    backgroundColor: '#F0F0F0',
  },
  chipWarning: {
    backgroundColor: '#FFF4E6',
  },
  chipSuccess: {
    backgroundColor: '#E8F5E8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextPrimary: {
    color: '#007AFF',
  },
  chipTextSecondary: {
    color: colors.grayText,
  },
  chipTextWarning: {
    color: '#FF9500',
  },
  chipTextSuccess: {
    color: '#198754',
  },
  notes: {
    fontSize: 14,
    color: colors.grayText,
    fontStyle: 'italic',
  },
  actions: {
    marginLeft: 16,
  },
  chevron: {
    fontSize: 20,
    color: colors.grayText,
    fontWeight: '300',
  },
});
