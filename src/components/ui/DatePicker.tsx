import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { Input } from './Input';

interface DatePickerProps {
  label?: string;
  required?: boolean;
  value: string; // ISO string
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  showTime?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  required = false,
  value,
  onValueChange,
  placeholder = 'Select date...',
  error,
  containerStyle,
  disabled = false,
  showTime = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  // Format date for display
  const formatDisplayDate = (isoString: string): string => {
    if (!isoString) return '';

    try {
      const date = new Date(isoString);
      if (showTime) {
        return date.toLocaleString('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } else {
        return date.toLocaleDateString('en-CA');
      }
    } catch {
      return isoString;
    }
  };

  // Set to current date/time
  const setToNow = () => {
    const now = new Date().toISOString();
    setTempDate(now);
  };

  // Set to today at midnight
  const setToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setTempDate(today.toISOString());
  };

  // Apply the temporary date
  const handleApply = () => {
    onValueChange(tempDate);
    setIsVisible(false);
  };

  // Cancel and revert
  const handleCancel = () => {
    setTempDate(value);
    setIsVisible(false);
  };

  // Handle manual input change
  const handleManualChange = (text: string) => {
    setTempDate(text);
  };

  // Validate ISO date string
  const isValidISODate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes('T');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !value && styles.selectorPlaceholder,
            disabled && styles.selectorTextDisabled,
          ]}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Text style={[styles.icon, disabled && styles.iconDisabled]}>📅</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Date'}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancel}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={setToNow}
                >
                  <Text style={styles.quickActionText}>Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={setToToday}
                >
                  <Text style={styles.quickActionText}>Today</Text>
                </TouchableOpacity>
              </View>

              {/* Manual Input */}
              <Input
                label="ISO Date String"
                value={tempDate}
                onChangeText={handleManualChange}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                autoCapitalize="none"
                error={
                  tempDate && !isValidISODate(tempDate)
                    ? 'Invalid date format'
                    : undefined
                }
                helpText="Enter date in ISO 8601 format"
              />

              {/* Preview */}
              {tempDate && isValidISODate(tempDate) && (
                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <Text style={styles.previewText}>
                    {formatDisplayDate(tempDate)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.applyButton,
                  (!tempDate || !isValidISODate(tempDate)) &&
                    styles.applyButtonDisabled,
                ]}
                onPress={handleApply}
                disabled={!tempDate || !isValidISODate(tempDate)}
              >
                <Text
                  style={[
                    styles.applyButtonText,
                    (!tempDate || !isValidISODate(tempDate)) &&
                      styles.applyButtonTextDisabled,
                  ]}
                >
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F4FD',
    minHeight: 48,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.darkText,
  },
  selectorPlaceholder: {
    color: colors.grayText,
    fontStyle: 'italic',
  },
  selectorTextDisabled: {
    color: colors.grayText,
  },
  icon: {
    fontSize: 16,
    marginLeft: 8,
  },
  iconDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FD',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.grayText,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  preview: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grayText,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    color: colors.darkText,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F4FD',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grayText,
  },
  applyButton: {
    backgroundColor: colors.primary,
  },
  applyButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  applyButtonTextDisabled: {
    color: colors.grayText,
  },
});
