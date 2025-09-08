import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { UnitSelector, UnitGroup } from '../ui/UnitSelector';

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
  // Removed unit suggestions and available units - now using chip selection

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
        <View style={styles.formWrapper}>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              {/* Item Name */}
              <View style={styles.firstFieldContainer}>
                <Input
                  label="Item Name"
                  required
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  placeholder="Enter item name"
                  error={errors.name && touched.name ? errors.name : undefined}
                />
              </View>

              {/* Category */}
              <Input
                label="Category"
                value={values.category}
                onChangeText={handleChange('category')}
                onBlur={handleBlur('category')}
                placeholder="Enter category (optional)"
              />

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
              <Switch
                label="Shelf-life Sensitive"
                value={values.shelfLifeSensitive}
                onValueChange={value =>
                  setFieldValue('shelfLifeSensitive', value)
                }
                testID="shelf-life-switch"
              />

              {/* Shelf Life Days (conditional) */}
              {values.shelfLifeSensitive && (
                <Input
                  label="Shelf Life (days)"
                  value={values.shelfLifeDays}
                  onChangeText={handleChange('shelfLifeDays')}
                  onBlur={handleBlur('shelfLifeDays')}
                  placeholder="Enter shelf life in days"
                  keyboardType="numeric"
                  error={
                    errors.shelfLifeDays && touched.shelfLifeDays
                      ? errors.shelfLifeDays
                      : undefined
                  }
                />
              )}

              {/* Usage Rate Per Day */}
              <Input
                label="Usage Rate (per day)"
                value={values.usageRatePerDay}
                onChangeText={handleChange('usageRatePerDay')}
                onBlur={handleBlur('usageRatePerDay')}
                placeholder="Enter usage rate (optional)"
                keyboardType="numeric"
                error={
                  errors.usageRatePerDay && touched.usageRatePerDay
                    ? errors.usageRatePerDay
                    : undefined
                }
              />

              {/* Notes */}
              <Input
                label="Notes"
                value={values.notes}
                onChangeText={handleChange('notes')}
                onBlur={handleBlur('notes')}
                placeholder="Enter notes (optional)"
                multiline
                numberOfLines={3}
                inputStyle={styles.textArea}
              />
            </View>
          </ScrollView>

          {/* Fixed Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onCancel}
              disabled={isSubmitting}
              fullWidth
              style={styles.cancelButton}
            />

            <Button
              title={submitButtonText}
              variant="primary"
              onPress={() => handleSubmit()}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              style={styles.submitButton}
            />
          </View>
        </View>
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
    paddingBottom: 20,
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
    marginRight: 0,
  },
  submitButton: {
    marginLeft: 0,
  },
});
