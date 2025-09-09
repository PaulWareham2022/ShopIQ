import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Formik, FormikProps } from 'formik';
import { colors } from '../../constants/colors';
import {
  InventoryItemSchema,
  CreateInventoryItemSchema,
  type ValidatedInventoryItem,
  type ValidatedNewInventoryItem,
} from '../../storage/validation/schemas';
import { InventoryItem } from '../../storage/types';
import {
  getUnitDimension,
  isSupportedUnit,
} from '../../storage/utils/canonical-units';
import { CanonicalDimension } from '../../storage/types';
import { getSmartUnitSuggestions } from '../../storage/utils/smart-unit-defaults';
import { OptimizedButton } from '../ui/OptimizedButton';
import { OptimizedInput } from '../ui/OptimizedInput';
import { OptimizedSwitch } from '../ui/OptimizedSwitch';
import { UnitSelector, UnitGroup } from '../ui/UnitSelector';
import { Chip } from '../ui/Chip';
import { useFormFocus } from '../../hooks/useFormFocus';

interface InventoryItemFormProps {
  initialValues?: Partial<InventoryItem>;
  onSubmit: (values: ValidatedInventoryItem) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
}

interface FormValues {
  name: string;
  category: string;
  canonicalUnit: string;
  shelfLifeSensitive: boolean;
  shelfLifeDays: string;
  usageRatePerDay: string;
  notes: string;
}

const UNIT_GROUPS: UnitGroup[] = [
  { variant: 'weight', units: ['kg', 'g', 'lb', 'oz'] },
  { variant: 'volume', units: ['L', 'ml', 'gal', 'fl oz'] },
  { variant: 'count', units: ['unit', 'piece', 'dozen', 'pack'] },
  { variant: 'length', units: ['m', 'cm', 'ft', 'in'] },
  { variant: 'area', units: ['m²', 'cm²', 'ft²', 'in²'] },
];

export const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Item',
}) => {
  const [detectedDimension, setDetectedDimension] =
    useState<CanonicalDimension | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Form focus management
  const fieldOrder = [
    'name',
    'category',
    'canonicalUnit',
    'shelfLifeDays',
    'usageRatePerDay',
    'notes'
  ];

  const formFocus = useFormFocus({
    fieldOrder,
    onSubmit: () => {
      // This will be handled by Formik's handleSubmit
    },
    onCancel,
  });

  // Handle notes field focus with automatic scrolling
  const handleNotesFocus = () => {
    formFocus.handleFieldFocus('notes');
    // Scroll to bottom to ensure notes field is visible above keyboard
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300); // Delay to allow keyboard to appear first
  };

  // Update smart suggestions when name or category changes
  const updateSmartSuggestions = (name: string, category: string) => {
    if (name.trim().length > 2) { // Only suggest after user has typed a few characters
      const suggestions = getSmartUnitSuggestions({
        itemName: name,
        category: category || undefined,
        existingCanonicalUnit: initialValues?.canonicalUnit,
      });
      
      // Get top 3 suggestions and show them
      const topSuggestions = suggestions
        .slice(0, 3)
        .map(s => s.unit)
        .filter(unit => unit !== initialValues?.canonicalUnit); // Don't suggest current unit
      
      setSmartSuggestions(topSuggestions);
      setShowSmartSuggestions(topSuggestions.length > 0);
    } else {
      setSmartSuggestions([]);
      setShowSmartSuggestions(false);
    }
  };

  // Map technical dimension names to user-friendly names
  const getDimensionDisplayName = (dimension: CanonicalDimension): string => {
    const dimensionMap: Record<CanonicalDimension, string> = {
      mass: 'Weight',
      volume: 'Volume',
      count: 'Count',
      length: 'Length',
      area: 'Area',
    };
    return dimensionMap[dimension];
  };

  // Removed useEffect for loading units - now using predefined chip categories

  const getInitialFormValues = (): FormValues => ({
    name: initialValues?.name || '',
    category: initialValues?.category || '',
    canonicalUnit: initialValues?.canonicalUnit || '',
    shelfLifeSensitive: initialValues?.shelfLifeSensitive || false,
    shelfLifeDays: initialValues?.shelfLifeDays?.toString() || '',
    usageRatePerDay: initialValues?.usageRatePerDay?.toString() || '',
    notes: initialValues?.notes || '',
  });

  const handleUnitChange = (
    unit: string,
    setFieldValue: (field: string, value: string) => void
  ) => {
    setFieldValue('canonicalUnit', unit);

    // Auto-detect dimension from unit
    const dimension = getUnitDimension(unit);
    setDetectedDimension(dimension || null);
  };

  const validateForm = (values: FormValues) => {
    const errors: Partial<FormValues> = {};

    if (!values.name.trim()) {
      errors.name = 'Item name is required';
    }

    if (!values.canonicalUnit.trim()) {
      errors.canonicalUnit = 'Unit is required';
    } else if (!isSupportedUnit(values.canonicalUnit)) {
      errors.canonicalUnit =
        'Unsupported unit. Please select from suggestions.';
    }

    if (
      values.shelfLifeDays &&
      (isNaN(Number(values.shelfLifeDays)) || Number(values.shelfLifeDays) <= 0)
    ) {
      errors.shelfLifeDays = 'Shelf life must be a positive number';
    }

    if (
      values.usageRatePerDay &&
      (isNaN(Number(values.usageRatePerDay)) ||
        Number(values.usageRatePerDay) < 0)
    ) {
      errors.usageRatePerDay = 'Usage rate must be a non-negative number';
    }

    return errors;
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    // debug removed
    try {
      // Convert form values to validated inventory item
      const inventoryItemData: any = {
        name: values.name.trim(),
        category: values.category.trim() || undefined,
        canonicalDimension: detectedDimension!,
        canonicalUnit: values.canonicalUnit.trim(),
        shelfLifeSensitive: values.shelfLifeSensitive,
        shelfLifeDays: values.shelfLifeDays
          ? Number(values.shelfLifeDays)
          : undefined,
        usageRatePerDay: values.usageRatePerDay
          ? Number(values.usageRatePerDay)
          : undefined,
        notes: values.notes.trim() || undefined,
        created_at: initialValues?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      };

      // Only include ID for existing items (editing)
      if (initialValues?.id) {
        inventoryItemData.id = initialValues.id;
      }

      // Choose schema: create vs update
      const isEditingExisting = Boolean(initialValues?.id);

      const chosenSchema = isEditingExisting
        ? InventoryItemSchema
        : CreateInventoryItemSchema;
      const validationResult = chosenSchema.safeParse(inventoryItemData);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues
          .map((err: any) => err.message)
          .join(', ');
        Alert.alert('Validation Error', errorMessages);
        return;
      }

      await onSubmit(
        validationResult.data as
          | ValidatedInventoryItem
          | ValidatedNewInventoryItem as any
      );
    } catch {
      // Error handling is done via Alert.alert
      Alert.alert('Error', 'Failed to save inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={getInitialFormValues()}
      validate={validateForm}
      onSubmit={handleSubmit}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        handleSubmit,
        isSubmitting,
      }: FormikProps<FormValues>) => (
        <KeyboardAvoidingView 
          style={styles.formWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
                {/* Mobile Form Tips */}
                <View style={styles.mobileTipsContainer}>
                  <Text style={styles.mobileTipsTitle}>Quick Entry Tips</Text>
                  <Text style={styles.mobileTipsText}>
                    Use keyboard "Next" button to move between fields • Units auto-detect based on item type
                  </Text>
                </View>

              {/* Item Name */}
              <View style={styles.firstFieldContainer}>
                <OptimizedInput
                  label="Item Name"
                  required
                  value={values.name}
                  onChangeText={(text) => {
                    handleChange('name')(text);
                    updateSmartSuggestions(text, values.category);
                  }}
                  onBlur={handleBlur('name')}
                  placeholder="Enter item name"
                  returnKeyType="next"
                  fieldName="name"
                  onSubmitEditing={formFocus.handleSubmitEditing}
                  onFocus={formFocus.handleFieldFocus}
                  error={errors.name && touched.name ? errors.name : undefined}
                  testID="inventory-form-item-name"
                />
              </View>

              {/* Category */}
              <OptimizedInput
                label="Category"
                value={values.category}
                onChangeText={(text) => {
                  handleChange('category')(text);
                  updateSmartSuggestions(values.name, text);
                }}
                onBlur={handleBlur('category')}
                placeholder="Enter category (optional)"
                returnKeyType="next"
                fieldName="category"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
              />

              {/* Smart Unit Suggestions */}
              {showSmartSuggestions && smartSuggestions.length > 0 && (
                <View style={styles.smartSuggestionsContainer}>
                  <Text style={styles.smartSuggestionsLabel}>
                    Suggested units for "{values.name}":
                  </Text>
                  <View style={styles.smartSuggestionsChips}>
                    {smartSuggestions.map((unit) => (
                      <Chip
                        key={unit}
                        label={unit}
                        variant="default"
                        onPress={() => {
                          handleUnitChange(unit, setFieldValue);
                          setShowSmartSuggestions(false); // Hide suggestions after selection
                        }}
                        style={styles.smartSuggestionChip}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Unit Selection */}
              <UnitSelector
                label="Unit"
                required
                value={values.canonicalUnit}
                onValueChange={unit => handleUnitChange(unit, setFieldValue)}
                unitGroups={UNIT_GROUPS}
                customInputPlaceholder="Or search"
                error={
                  errors.canonicalUnit && touched.canonicalUnit
                    ? errors.canonicalUnit
                    : undefined
                }
              />

              {detectedDimension && (
                <Text style={styles.dimensionText}>
                  Unit Type: {getDimensionDisplayName(detectedDimension)}
                </Text>
              )}

              {/* Shelf Life Sensitivity */}
              <OptimizedSwitch
                label="Shelf-life Sensitive"
                value={values.shelfLifeSensitive}
                onValueChange={value =>
                  setFieldValue('shelfLifeSensitive', value)
                }
                testID="shelf-life-switch"
              />

              {/* Shelf Life Days (conditional) */}
              {values.shelfLifeSensitive && (
                <OptimizedInput
                  label="Shelf Life (days)"
                  value={values.shelfLifeDays}
                  onChangeText={handleChange('shelfLifeDays')}
                  onBlur={handleBlur('shelfLifeDays')}
                  placeholder="Enter shelf life in days"
                  keyboardType="numeric"
                  returnKeyType="next"
                  fieldName="shelfLifeDays"
                  onSubmitEditing={formFocus.handleSubmitEditing}
                  onFocus={formFocus.handleFieldFocus}
                  error={
                    errors.shelfLifeDays && touched.shelfLifeDays
                      ? errors.shelfLifeDays
                      : undefined
                  }
                />
              )}

              {/* Usage Rate Per Day */}
              <OptimizedInput
                label="Usage Rate (per day)"
                value={values.usageRatePerDay}
                onChangeText={handleChange('usageRatePerDay')}
                onBlur={handleBlur('usageRatePerDay')}
                placeholder="Enter usage rate (optional)"
                keyboardType="numeric"
                returnKeyType="next"
                fieldName="usageRatePerDay"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
                error={
                  errors.usageRatePerDay && touched.usageRatePerDay
                    ? errors.usageRatePerDay
                    : undefined
                }
              />

              {/* Notes */}
              <OptimizedInput
                label="Notes"
                value={values.notes}
                onChangeText={handleChange('notes')}
                onBlur={handleBlur('notes')}
                placeholder="Enter notes (optional)"
                multiline
                numberOfLines={3}
                inputStyle={styles.textArea}
                returnKeyType="default"
                fieldName="notes"
                onSubmitEditing={() => {
                  // For multiline text, don't submit form on return
                  // Let user manually tap submit button
                }}
                onFocus={handleNotesFocus}
              />
            </View>
          </ScrollView>

          {/* Fixed Action Buttons */}
          <View style={styles.buttonContainer}>
            <OptimizedButton
              title="Cancel"
              variant="secondary"
              onPress={onCancel}
              disabled={isSubmitting}
              style={styles.cancelButton}
              testID="inventory-form-cancel-button"
            />

            <OptimizedButton
              title={submitButtonText}
              variant="primary"
              onPress={() => handleSubmit()}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.submitButton}
              testID="inventory-form-submit-button"
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  formWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Warmer, softer background
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to ensure notes field is visible above keyboard
  },
  form: {
    padding: 0,
    paddingHorizontal: 20,
  },
  firstFieldContainer: {
    marginTop: 10, // 10px padding between header and first field
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dimensionText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 20,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E8F4FD',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  cancelButton: {
    flex: 0.35, // Give cancel button 35% of available space
    marginRight: 0,
  },
  submitButton: {
    flex: 0.65, // Give submit button 65% of available space
    marginLeft: 0,
  },
  // Mobile tips styles
  mobileTipsContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0F0FF',
  },
  mobileTipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  mobileTipsText: {
    fontSize: 11,
    color: colors.grayText,
    lineHeight: 16,
  },
  // Smart suggestions styles
  smartSuggestionsContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E0F0FF',
  },
  smartSuggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  smartSuggestionsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smartSuggestionChip: {
    marginRight: 0,
    marginBottom: 0,
  },
});
