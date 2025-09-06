import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Formik, FormikProps } from 'formik';
import { colors } from '../../constants/colors';
import { Button, Input, Switch, Chip } from '../ui';
import { OfferInput } from '../../storage/repositories/OfferRepository';
import { InventoryItem } from '../../storage/types';
import { Supplier } from '../../storage/types';
import {
  OfferFormInputSchema,
  ValidatedOfferFormInput,
  createFormikValidation,
} from '../../storage/validation';

interface OfferFormProps {
  initialValues?: Partial<OfferInput>;
  onSubmit: (values: OfferInput) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  availableInventoryItems: InventoryItem[];
  availableSuppliers: Supplier[];
}

// Use the validated form input type from Zod schema
type FormValues = ValidatedOfferFormInput;

// Common currencies for quick selection
const COMMON_CURRENCIES = ['CAD', 'USD', 'GBP', 'EUR', 'AUD', 'JPY'];

// Source type options
const SOURCE_TYPES: Array<{
  label: string;
  value: 'manual' | 'url' | 'ocr' | 'api';
}> = [
  { label: 'Manual Entry', value: 'manual' },
  { label: 'Website URL', value: 'url' },
  { label: 'Photo/OCR', value: 'ocr' },
  { label: 'API Import', value: 'api' },
];

// Quality rating options (1-5 stars)
const QUALITY_RATINGS = [1, 2, 3, 4, 5];

export const OfferForm: React.FC<OfferFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Offer',
  availableInventoryItems,
  availableSuppliers,
}) => {
  // Remove unused state variables - they were for future picker enhancements
  // const [selectedCurrency, setSelectedCurrency] = useState(
  //   initialValues?.currency || ''
  // );
  // const [selectedSourceType, setSelectedSourceType] = useState<'manual' | 'url' | 'ocr' | 'api'>(
  //   initialValues?.source_type || 'manual'
  // );
  // const [selectedQualityRating, setSelectedQualityRating] = useState(
  //   initialValues?.quality_rating?.toString() || ''
  // );

  const getInitialFormValues = (): FormValues => {
    // Get current date in ISO format for observed_at default
    const now = new Date().toISOString();

    return {
      inventoryItemId: initialValues?.inventory_item_id || '',
      supplierId: initialValues?.supplier_id || '',
      supplierNameSnapshot: initialValues?.supplier_name_snapshot || '',
      supplierUrl: initialValues?.supplier_url || '',
      sourceType: initialValues?.source_type || 'manual',
      sourceUrl: initialValues?.source_url || '',
      observedAt: initialValues?.observed_at || now,
      totalPrice: initialValues?.total_price?.toString() || '',
      currency: initialValues?.currency || '',
      isTaxIncluded: initialValues?.is_tax_included ?? true,
      taxRate: initialValues?.tax_rate?.toString() || '',
      shippingCost: initialValues?.shipping_cost?.toString() || '',
      shippingIncluded: initialValues?.shipping_included ?? false,
      amount: initialValues?.amount?.toString() || '',
      amountUnit: initialValues?.amount_unit || '',
      qualityRating: initialValues?.quality_rating?.toString() || '',
      notes: initialValues?.notes || '',
      photoUri: initialValues?.photo_uri || '',
    };
  };

  // Create Zod-based validation function
  const validateForm = createFormikValidation(OfferFormInputSchema);

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      // Validate the form data with Zod schema before processing
      const validationResult = OfferFormInputSchema.safeParse(values);

      if (!validationResult.success) {
        // This shouldn't happen if Formik validation is working correctly,
        // but it's a good safety net
        Alert.alert(
          'Validation Error',
          'Please check your input and try again.'
        );
        return;
      }

      const validatedValues = validationResult.data;

      // Get selected supplier name for snapshot
      const selectedSupplier = availableSuppliers.find(
        s => s.id === validatedValues.supplierId
      );
      const supplierNameSnapshot =
        selectedSupplier?.name || validatedValues.supplierNameSnapshot;

      // Convert validated form values to OfferInput
      const offerInput: OfferInput = {
        inventory_item_id: validatedValues.inventoryItemId,
        supplier_id: validatedValues.supplierId,
        supplier_name_snapshot: supplierNameSnapshot,
        supplier_url: validatedValues.supplierUrl?.trim() || undefined,
        source_type: validatedValues.sourceType,
        source_url: validatedValues.sourceUrl?.trim() || undefined,
        observed_at: validatedValues.observedAt,
        total_price: Number(validatedValues.totalPrice),
        currency: validatedValues.currency.trim().toUpperCase(),
        is_tax_included: validatedValues.isTaxIncluded,
        tax_rate: validatedValues.taxRate
          ? Number(validatedValues.taxRate)
          : undefined,
        shipping_cost: validatedValues.shippingCost
          ? Number(validatedValues.shippingCost)
          : undefined,
        shipping_included: validatedValues.shippingIncluded,
        amount: Number(validatedValues.amount),
        amount_unit: validatedValues.amountUnit.trim(),
        quality_rating: validatedValues.qualityRating
          ? Number(validatedValues.qualityRating)
          : undefined,
        notes: validatedValues.notes?.trim() || undefined,
        photo_uri: validatedValues.photoUri?.trim() || undefined,
      };

      await onSubmit(offerInput);
    } catch (error) {
      // Log error for debugging in development
      if (__DEV__) {
        console.error('Form submission error:', error);
      }
      Alert.alert('Error', 'Failed to save offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get inventory item name by ID
  const getInventoryItemName = (id: string): string => {
    const item = availableInventoryItems.find(item => item.id === id);
    return item ? item.name : 'Unknown Item';
  };

  // Get supplier name by ID
  const getSupplierName = (id: string): string => {
    const supplier = availableSuppliers.find(supplier => supplier.id === id);
    return supplier ? supplier.name : 'Unknown Supplier';
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
              {/* Inventory Item Selection */}
              <View style={styles.firstFieldContainer}>
                <Text style={styles.label}>
                  Inventory Item <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.selectedValue}>
                  {values.inventoryItemId
                    ? getInventoryItemName(values.inventoryItemId)
                    : 'Select an item...'}
                </Text>
                {/* TODO: Replace with proper picker component */}
                <Input
                  value={values.inventoryItemId}
                  onChangeText={handleChange('inventoryItemId')}
                  placeholder="Enter inventory item ID (temporary)"
                  error={
                    errors.inventoryItemId && touched.inventoryItemId
                      ? errors.inventoryItemId
                      : undefined
                  }
                />
              </View>

              {/* Supplier Selection */}
              <View>
                <Text style={styles.label}>
                  Supplier <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.selectedValue}>
                  {values.supplierId
                    ? getSupplierName(values.supplierId)
                    : 'Select a supplier...'}
                </Text>
                {/* TODO: Replace with proper picker component */}
                <Input
                  value={values.supplierId}
                  onChangeText={handleChange('supplierId')}
                  placeholder="Enter supplier ID (temporary)"
                  error={
                    errors.supplierId && touched.supplierId
                      ? errors.supplierId
                      : undefined
                  }
                />
              </View>

              {/* Source Type */}
              <View>
                <Text style={styles.label}>Source Type</Text>
                <View style={styles.chipContainer}>
                  {SOURCE_TYPES.map(source => (
                    <Chip
                      key={source.value}
                      label={source.label}
                      variant="default"
                      onPress={() => {
                        setFieldValue('sourceType', source.value);
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Total Price */}
              <Input
                label="Total Price"
                required
                value={values.totalPrice}
                onChangeText={handleChange('totalPrice')}
                onBlur={handleBlur('totalPrice')}
                placeholder="Enter total price"
                keyboardType="numeric"
                error={
                  errors.totalPrice && touched.totalPrice
                    ? errors.totalPrice
                    : undefined
                }
              />

              {/* Currency */}
              <View>
                <Input
                  label="Currency"
                  required
                  value={values.currency}
                  onChangeText={text => {
                    const upperText = text.toUpperCase();
                    setFieldValue('currency', upperText);
                  }}
                  onBlur={handleBlur('currency')}
                  placeholder="e.g., CAD, USD, EUR"
                  maxLength={3}
                  autoCapitalize="characters"
                  error={
                    errors.currency && touched.currency
                      ? errors.currency
                      : undefined
                  }
                />
                <View style={styles.chipContainer}>
                  {COMMON_CURRENCIES.map(currency => (
                    <Chip
                      key={currency}
                      label={currency}
                      variant="default"
                      onPress={() => {
                        setFieldValue('currency', currency);
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Amount and Unit */}
              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Amount"
                    required
                    value={values.amount}
                    onChangeText={handleChange('amount')}
                    onBlur={handleBlur('amount')}
                    placeholder="Quantity"
                    keyboardType="numeric"
                    error={
                      errors.amount && touched.amount
                        ? errors.amount
                        : undefined
                    }
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Input
                    label="Unit"
                    required
                    value={values.amountUnit}
                    onChangeText={handleChange('amountUnit')}
                    onBlur={handleBlur('amountUnit')}
                    placeholder="e.g., kg, L, unit"
                    error={
                      errors.amountUnit && touched.amountUnit
                        ? errors.amountUnit
                        : undefined
                    }
                  />
                </View>
              </View>

              {/* Observed Date */}
              <Input
                label="Observed Date"
                value={values.observedAt}
                onChangeText={handleChange('observedAt')}
                onBlur={handleBlur('observedAt')}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                // TODO: Replace with proper date picker
              />

              {/* Tax Information */}
              <Text style={styles.sectionTitle}>Tax Information</Text>

              <Switch
                label="Tax Included in Price"
                value={values.isTaxIncluded}
                onValueChange={value => setFieldValue('isTaxIncluded', value)}
              />

              {!values.isTaxIncluded && (
                <Input
                  label="Tax Rate"
                  value={values.taxRate}
                  onChangeText={handleChange('taxRate')}
                  onBlur={handleBlur('taxRate')}
                  placeholder="e.g., 0.15 for 15%"
                  keyboardType="numeric"
                  error={
                    errors.taxRate && touched.taxRate
                      ? errors.taxRate
                      : undefined
                  }
                />
              )}

              {/* Shipping Information */}
              <Text style={styles.sectionTitle}>Shipping Information</Text>

              <Switch
                label="Shipping Included"
                value={values.shippingIncluded}
                onValueChange={value =>
                  setFieldValue('shippingIncluded', value)
                }
              />

              {!values.shippingIncluded && (
                <Input
                  label="Shipping Cost"
                  value={values.shippingCost}
                  onChangeText={handleChange('shippingCost')}
                  onBlur={handleBlur('shippingCost')}
                  placeholder="Enter shipping cost"
                  keyboardType="numeric"
                  error={
                    errors.shippingCost && touched.shippingCost
                      ? errors.shippingCost
                      : undefined
                  }
                />
              )}

              {/* Quality Rating */}
              <View>
                <Text style={styles.label}>Quality Rating (1-5)</Text>
                <View style={styles.chipContainer}>
                  {QUALITY_RATINGS.map(rating => (
                    <Chip
                      key={rating}
                      label={`${rating} ⭐`}
                      variant="default"
                      onPress={() => {
                        setFieldValue('qualityRating', rating.toString());
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Optional Fields */}
              <Text style={styles.sectionTitle}>Optional Information</Text>

              <Input
                label="Supplier URL"
                value={values.supplierUrl}
                onChangeText={handleChange('supplierUrl')}
                onBlur={handleBlur('supplierUrl')}
                placeholder="Product page URL"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Input
                label="Source URL"
                value={values.sourceUrl}
                onChangeText={handleChange('sourceUrl')}
                onBlur={handleBlur('sourceUrl')}
                placeholder="Where this data was captured from"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Input
                label="Photo URI"
                value={values.photoUri}
                onChangeText={handleChange('photoUri')}
                onBlur={handleBlur('photoUri')}
                placeholder="Path to product photo"
              />

              {/* Notes */}
              <Input
                label="Notes"
                value={values.notes}
                onChangeText={handleChange('notes')}
                onBlur={handleBlur('notes')}
                placeholder="Additional notes (optional)"
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
    backgroundColor: '#F8F9FA',
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
    marginTop: 10,
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
  selectedValue: {
    fontSize: 16,
    color: colors.grayText,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginTop: 24,
    marginBottom: 16,
    marginLeft: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
