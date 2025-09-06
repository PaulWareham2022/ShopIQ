import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Formik, FormikProps } from 'formik';
import { colors } from '../../constants/colors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { Chip } from '../ui/Chip';
import { Picker, PickerItem } from '../ui/Picker';
import { DatePicker } from '../ui/DatePicker';
import { OfferInput } from '../../storage/repositories/OfferRepository';
import { InventoryItem } from '../../storage/types';
import { Supplier } from '../../storage/types';
import {
  OfferFormInputSchema,
  ValidatedOfferFormInput,
  createFormikValidation,
} from '../../storage/validation';
import { getRepositoryFactory } from '../../storage/RepositoryFactory';
import {
  validateAndConvert,
  getCanonicalUnit,
  isSupportedUnit,
  formatAmount,
} from '../../storage/utils/canonical-units';

interface OfferFormProps {
  initialValues?: Partial<OfferInput>;
  onSubmit: (values: OfferInput) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  availableInventoryItems?: InventoryItem[]; // Optional - will fetch if not provided
  availableSuppliers?: Supplier[]; // Optional - will fetch if not provided
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

// Interface for computed price metrics
interface PriceMetrics {
  canonicalAmount?: number;
  canonicalUnit?: string;
  pricePerCanonicalExclShipping?: number;
  pricePerCanonicalInclShipping?: number;
  effectivePricePerCanonical?: number;
  isValidUnit: boolean;
  unitError?: string;
}

/**
 * Compute normalized price metrics in real-time
 */
const computePriceMetrics = (
  totalPrice: string,
  amount: string,
  amountUnit: string,
  shippingCost: string,
  shippingIncluded: boolean,
  selectedInventoryItem?: InventoryItem
): PriceMetrics => {
  // Parse numeric values
  const totalPriceNum = parseFloat(totalPrice);
  const amountNum = parseFloat(amount);
  const shippingCostNum = parseFloat(shippingCost) || 0;

  // Early return if basic validation fails
  if (
    !selectedInventoryItem ||
    !amountUnit.trim() ||
    isNaN(totalPriceNum) ||
    isNaN(amountNum) ||
    totalPriceNum <= 0 ||
    amountNum <= 0
  ) {
    return {
      isValidUnit: false,
    };
  }

  // Check if unit is supported
  if (!isSupportedUnit(amountUnit.trim())) {
    return {
      isValidUnit: false,
      unitError: `Unit "${amountUnit}" is not supported`,
    };
  }

  // Validate and convert to canonical unit
  const validation = validateAndConvert(
    amountNum,
    amountUnit.trim(),
    selectedInventoryItem.canonicalDimension
  );

  if (!validation.isValid || validation.canonicalAmount === undefined) {
    return {
      isValidUnit: false,
      unitError: validation.errorMessage || 'Unit conversion failed',
    };
  }

  const canonicalAmount = validation.canonicalAmount;
  const canonicalUnit =
    validation.canonicalUnit ||
    getCanonicalUnit(selectedInventoryItem.canonicalDimension);

  // Calculate price per canonical unit (excluding shipping)
  const pricePerCanonicalExclShipping = totalPriceNum / canonicalAmount;

  // Calculate price including shipping
  const totalWithShipping = shippingIncluded
    ? totalPriceNum
    : totalPriceNum + shippingCostNum;
  const pricePerCanonicalInclShipping = totalWithShipping / canonicalAmount;

  // Effective price (for now, same as including shipping)
  const effectivePricePerCanonical = pricePerCanonicalInclShipping;

  return {
    canonicalAmount,
    canonicalUnit,
    pricePerCanonicalExclShipping,
    pricePerCanonicalInclShipping,
    effectivePricePerCanonical,
    isValidUnit: true,
  };
};

export const OfferForm: React.FC<OfferFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Offer',
  availableInventoryItems: propInventoryItems,
  availableSuppliers: propSuppliers,
}) => {
  // State for fetched data
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    propInventoryItems || []
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(propSuppliers || []);
  const [isLoading, setIsLoading] = useState(!propInventoryItems || !propSuppliers);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      // eslint-disable-next-line no-console
      console.log('OfferForm useEffect - propInventoryItems:', propInventoryItems?.length, 'propSuppliers:', propSuppliers?.length);
      
      // If data is provided as props, use it directly
      if (propInventoryItems && propSuppliers) {
        // eslint-disable-next-line no-console
        console.log('OfferForm - Using props data directly');
        setInventoryItems(propInventoryItems);
        setSuppliers(propSuppliers);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const factory = getRepositoryFactory();

        // Fetch inventory items if not provided
        if (!propInventoryItems) {
          const inventoryRepo = await factory.getInventoryItemRepository();
          const items = await inventoryRepo.findAll();
          setInventoryItems(items.filter(item => !item.deleted_at));
        } else {
          setInventoryItems(propInventoryItems);
        }

        // Fetch suppliers if not provided
        if (!propSuppliers) {
          const supplierRepo = await factory.getSupplierRepository();
          const supplierList = await supplierRepo.findAll();
          setSuppliers(supplierList.filter(supplier => !supplier.deleted_at));
        } else {
          setSuppliers(propSuppliers);
        }
      } catch {
        setLoadError('Failed to load form data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [propInventoryItems, propSuppliers]);

  const getInitialFormValues = (): FormValues => {
    // Get current date in ISO format for observed_at default
    const now = new Date().toISOString();

    return {
      inventoryItemId: initialValues?.inventoryItemId || '',
      supplierId: initialValues?.supplierId || '',
      supplierNameSnapshot: initialValues?.supplierNameSnapshot || '',
      supplierUrl: initialValues?.supplierUrl || '',
      sourceType: initialValues?.sourceType || 'manual',
      sourceUrl: initialValues?.sourceUrl || '',
      observedAt: initialValues?.observedAt || now,
      totalPrice: initialValues?.totalPrice?.toString() || '',
      currency: initialValues?.currency || '',
      isTaxIncluded: initialValues?.isTaxIncluded ?? true,
      taxRate: initialValues?.taxRate?.toString() || '',
      shippingCost: initialValues?.shippingCost?.toString() || '',
      shippingIncluded: initialValues?.shippingIncluded ?? false,
      amount: initialValues?.amount?.toString() || '',
      amountUnit: initialValues?.amountUnit || '',
      qualityRating: initialValues?.qualityRating?.toString() || '',
      notes: initialValues?.notes || '',
      photoUri: initialValues?.photoUri || '',
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
      const selectedSupplier = suppliers.find(
        s => s.id === validatedValues.supplierId
      );
      const supplierNameSnapshot =
        selectedSupplier?.name || validatedValues.supplierNameSnapshot;

      // Debug logging for form submission
      // eslint-disable-next-line no-console
      console.log(
        'OfferForm - Form submission - inventoryItemId:',
        validatedValues.inventoryItemId
      );
      // eslint-disable-next-line no-console
      console.log(
        'OfferForm - Form submission - selected inventory item:',
        inventoryItems.find(item => item.id === validatedValues.inventoryItemId)
      );

      // Convert validated form values to OfferInput
      const offerInput: OfferInput = {
        inventoryItemId: validatedValues.inventoryItemId,
        supplierId: validatedValues.supplierId,
        supplierNameSnapshot: supplierNameSnapshot,
        supplierUrl: validatedValues.supplierUrl?.trim() || undefined,
        sourceType: validatedValues.sourceType,
        sourceUrl: validatedValues.sourceUrl?.trim() || undefined,
        observedAt: validatedValues.observedAt,
        totalPrice: Number(validatedValues.totalPrice),
        currency: validatedValues.currency.trim().toUpperCase(),
        isTaxIncluded: validatedValues.isTaxIncluded,
        taxRate: validatedValues.taxRate
          ? Number(validatedValues.taxRate)
          : undefined,
        shippingCost: validatedValues.shippingCost
          ? Number(validatedValues.shippingCost)
          : undefined,
        shippingIncluded: validatedValues.shippingIncluded,
        amount: Number(validatedValues.amount),
        amountUnit: validatedValues.amountUnit.trim(),
        qualityRating: validatedValues.qualityRating
          ? Number(validatedValues.qualityRating)
          : undefined,
        notes: validatedValues.notes?.trim() || undefined,
        photoUri: validatedValues.photoUri?.trim() || undefined,
      };

      await onSubmit(offerInput);
    } catch {
      Alert.alert('Error', 'Failed to save offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Convert data to picker items
  const inventoryPickerItems: PickerItem[] = inventoryItems.map(item => ({
    id: item.id,
    label: item.name,
    subtitle: item.category || undefined,
  }));

  // Debug logging for inventory items
  // eslint-disable-next-line no-console
  console.log(
    'OfferForm - Available inventory items:',
    inventoryItems.map(item => ({ id: item.id, name: item.name }))
  );
  // eslint-disable-next-line no-console
  console.log(
    'OfferForm - Picker items:',
    inventoryPickerItems.map(item => ({ id: item.id, label: item.label }))
  );

  const supplierPickerItems: PickerItem[] = suppliers.map(supplier => ({
    id: supplier.id,
    label: supplier.name,
    subtitle: `${supplier.countryCode}${supplier.regionCode ? ` - ${supplier.regionCode}` : ''}`,
  }));

  // Debug logging for suppliers
  // eslint-disable-next-line no-console
  console.log(
    'OfferForm - Available suppliers:',
    suppliers.map(supplier => ({ id: supplier.id, name: supplier.name }))
  );
  // eslint-disable-next-line no-console
  console.log(
    'OfferForm - Supplier picker items:',
    supplierPickerItems.map(item => ({ id: item.id, label: item.label }))
  );

  // Show loading or error state
  if (isLoading) {
    return (
      <View style={styles.formWrapper}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>Loading Form Data...</Text>
          <Text style={styles.loadingMessage}>Please wait while we load inventory items and suppliers.</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.formWrapper}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Form</Text>
          <Text style={styles.errorMessage}>{loadError}</Text>
          <Button
            title="Retry"
            variant="primary"
            onPress={() => {
              setLoadError(null);
              // Re-trigger useEffect by clearing and setting state
              if (!propInventoryItems) setInventoryItems([]);
              if (!propSuppliers) setSuppliers([]);
            }}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

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
      }: FormikProps<FormValues>) => {
        // Get selected inventory item for unit conversion
        const selectedInventoryItem = inventoryItems.find(
          item => item.id === values.inventoryItemId
        );

        // Compute price metrics in real-time (direct computation without useMemo to avoid hooks rule violation)
        const priceMetrics = computePriceMetrics(
          values.totalPrice,
          values.amount,
          values.amountUnit,
          values.shippingCost || '0',
          values.shippingIncluded,
          selectedInventoryItem
        );

        return (
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
                  <Picker
                    label="Inventory Item"
                    required
                    value={values.inventoryItemId}
                    onValueChange={value =>
                      setFieldValue('inventoryItemId', value)
                    }
                    items={inventoryPickerItems}
                    placeholder="Select an inventory item..."
                    error={
                      errors.inventoryItemId && touched.inventoryItemId
                        ? errors.inventoryItemId
                        : undefined
                    }
                    emptyText="No inventory items available. Add some items first."
                  />
                </View>

                {/* Supplier Selection */}
                <Picker
                  label="Supplier"
                  required
                  value={values.supplierId}
                  onValueChange={value => setFieldValue('supplierId', value)}
                  items={supplierPickerItems}
                  placeholder="Select a supplier..."
                  error={
                    errors.supplierId && touched.supplierId
                      ? errors.supplierId
                      : undefined
                  }
                  emptyText="No suppliers available. Add some suppliers first."
                />

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

                {/* Price Computation Display */}
                {priceMetrics.isValidUnit && priceMetrics.canonicalUnit && (
                  <View style={styles.priceComputationContainer}>
                    <Text style={styles.sectionTitle}>Price Analysis</Text>

                    {/* Canonical Unit Info */}
                    <View style={styles.computationRow}>
                      <Text style={styles.computationLabel}>
                        Canonical Amount:
                      </Text>
                      <Text style={styles.computationValue}>
                        {formatAmount(
                          priceMetrics.canonicalAmount || 0,
                          priceMetrics.canonicalUnit
                        )}
                      </Text>
                    </View>

                    {/* Price per canonical unit (excluding shipping) */}
                    <View style={styles.computationRow}>
                      <Text style={styles.computationLabel}>
                        Price per {priceMetrics.canonicalUnit} (excl. shipping):
                      </Text>
                      <Text style={styles.computationValue}>
                        {values.currency}{' '}
                        {(
                          priceMetrics.pricePerCanonicalExclShipping || 0
                        ).toFixed(4)}
                      </Text>
                    </View>

                    {/* Price per canonical unit (including shipping) */}
                    <View style={styles.computationRow}>
                      <Text style={styles.computationLabel}>
                        Price per {priceMetrics.canonicalUnit} (incl. shipping):
                      </Text>
                      <Text style={styles.computationValueHighlight}>
                        {values.currency}{' '}
                        {(
                          priceMetrics.pricePerCanonicalInclShipping || 0
                        ).toFixed(4)}
                      </Text>
                    </View>

                    {/* Effective price (main comparison metric) */}
                    <View style={styles.computationRow}>
                      <Text style={styles.computationLabelPrimary}>
                        Effective Price per {priceMetrics.canonicalUnit}:
                      </Text>
                      <Text style={styles.computationValuePrimary}>
                        {values.currency}{' '}
                        {(priceMetrics.effectivePricePerCanonical || 0).toFixed(
                          4
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Unit Error Display */}
                {!priceMetrics.isValidUnit &&
                  priceMetrics.unitError &&
                  values.amountUnit.trim() && (
                    <View style={styles.unitErrorContainer}>
                      <Text style={styles.unitErrorText}>
                        {priceMetrics.unitError}
                      </Text>
                    </View>
                  )}

                {/* Observed Date */}
                <DatePicker
                  label="Observed Date"
                  value={values.observedAt}
                  onValueChange={value => setFieldValue('observedAt', value)}
                  placeholder="Select date and time..."
                  error={
                    errors.observedAt && touched.observedAt
                      ? errors.observedAt
                      : undefined
                  }
                  showTime={true}
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
                onPress={handleSubmit}
                disabled={isSubmitting}
                loading={isSubmitting}
                fullWidth
                style={styles.submitButton}
              />
            </View>
          </View>
        );
      }}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: 16,
    color: colors.grayText,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.grayText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
  // Price computation styles
  priceComputationContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E8F4FD',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  computationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  computationLabel: {
    fontSize: 14,
    color: colors.grayText,
    flex: 1,
    marginRight: 12,
  },
  computationLabelPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    flex: 1,
    marginRight: 12,
  },
  computationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkText,
    textAlign: 'right',
  },
  computationValueHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  computationValuePrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'right',
  },
  unitErrorContainer: {
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  unitErrorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
});
