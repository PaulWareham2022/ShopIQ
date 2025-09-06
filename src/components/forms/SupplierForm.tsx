import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Formik, FormikProps } from 'formik';
import { colors } from '../../constants/colors';
import {
  SupplierSchema,
  CreateSupplierSchema,
  type ValidatedSupplier,
  type ValidatedNewSupplier,
} from '../../storage/validation/schemas';
import { Supplier, ShippingPolicy } from '../../storage/types';
import {
  validateCountryCode,
  validateRegionCode,
  validateCurrencyCode,
  validateUrlPatterns,
} from '../../storage/utils/iso-validation';
import { Button, Input, Switch, Chip } from '../ui';

interface SupplierFormProps {
  initialValues?: Partial<Supplier>;
  onSubmit: (values: ValidatedSupplier) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
}

interface FormValues {
  name: string;
  countryCode: string;
  regionCode: string;
  storeCode: string;
  defaultCurrency: string;
  membershipRequired: boolean;
  membershipType: string;
  freeShippingThreshold: string;
  shippingBaseCost: string;
  shippingPerItemCost: string;
  pickupAvailable: boolean;
  urlPatterns: string;
  notes: string;
}

// Common country codes for quick selection
const COMMON_COUNTRIES = ['CA', 'US', 'GB', 'AU', 'DE', 'FR', 'JP'];

// Common currencies for quick selection
const COMMON_CURRENCIES = ['CAD', 'USD', 'GBP', 'EUR', 'AUD', 'JPY'];

export const SupplierForm: React.FC<SupplierFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Supplier',
}) => {
  const [selectedCountry, setSelectedCountry] = useState(
    initialValues?.countryCode || ''
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialValues?.defaultCurrency || ''
  );

  const getInitialFormValues = (): FormValues => ({
    name: initialValues?.name || '',
    countryCode: initialValues?.countryCode || '',
    regionCode: initialValues?.regionCode || '',
    storeCode: initialValues?.storeCode || '',
    defaultCurrency: initialValues?.defaultCurrency || '',
    membershipRequired: initialValues?.membershipRequired || false,
    membershipType: initialValues?.membershipType || '',
    freeShippingThreshold:
      initialValues?.shippingPolicy?.freeShippingThreshold?.toString() || '',
    shippingBaseCost:
      initialValues?.shippingPolicy?.shippingBaseCost?.toString() || '',
    shippingPerItemCost:
      initialValues?.shippingPolicy?.shippingPerItemCost?.toString() || '',
    pickupAvailable: initialValues?.shippingPolicy?.pickupAvailable || false,
    urlPatterns: initialValues?.urlPatterns?.join(', ') || '',
    notes: initialValues?.notes || '',
  });

  const validateForm = (values: FormValues) => {
    const errors: Partial<FormValues> = {};

    // Validate name
    if (!values.name.trim()) {
      errors.name = 'Supplier name is required';
    } else if (values.name.trim().length > 200) {
      errors.name = 'Supplier name is too long (max 200 characters)';
    }

    // Validate country code using comprehensive validation
    if (!values.countryCode.trim()) {
      errors.countryCode = 'Country code is required';
    } else {
      const countryValidation = validateCountryCode(values.countryCode);
      if (!countryValidation.isValid) {
        errors.countryCode = countryValidation.error;
      }
    }

    // Validate region code using comprehensive validation
    if (values.regionCode.trim()) {
      const regionValidation = validateRegionCode(
        values.regionCode,
        values.countryCode
      );
      if (!regionValidation.isValid) {
        errors.regionCode = regionValidation.error;
      }
    }

    // Validate currency code using comprehensive validation
    if (!values.defaultCurrency.trim()) {
      errors.defaultCurrency = 'Default currency is required';
    } else {
      const currencyValidation = validateCurrencyCode(values.defaultCurrency);
      if (!currencyValidation.isValid) {
        errors.defaultCurrency = currencyValidation.error;
      }
    }

    // Validate URL patterns
    if (values.urlPatterns.trim()) {
      const patterns = values.urlPatterns
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
      const urlValidation = validateUrlPatterns(patterns);
      if (!urlValidation.isValid) {
        errors.urlPatterns = urlValidation.error;
      }
    }

    // Validate shipping costs
    if (
      values.freeShippingThreshold &&
      (isNaN(Number(values.freeShippingThreshold)) ||
        Number(values.freeShippingThreshold) < 0)
    ) {
      errors.freeShippingThreshold =
        'Free shipping threshold must be a non-negative number';
    }

    if (
      values.shippingBaseCost &&
      (isNaN(Number(values.shippingBaseCost)) ||
        Number(values.shippingBaseCost) < 0)
    ) {
      errors.shippingBaseCost =
        'Shipping base cost must be a non-negative number';
    }

    if (
      values.shippingPerItemCost &&
      (isNaN(Number(values.shippingPerItemCost)) ||
        Number(values.shippingPerItemCost) < 0)
    ) {
      errors.shippingPerItemCost =
        'Shipping per-item cost must be a non-negative number';
    }

    return errors;
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      // Build shipping policy object
      const shippingPolicy: ShippingPolicy | undefined =
        values.freeShippingThreshold ||
        values.shippingBaseCost ||
        values.shippingPerItemCost ||
        values.pickupAvailable
          ? {
              freeShippingThreshold: values.freeShippingThreshold
                ? Number(values.freeShippingThreshold)
                : undefined,
              shippingBaseCost: values.shippingBaseCost
                ? Number(values.shippingBaseCost)
                : undefined,
              shippingPerItemCost: values.shippingPerItemCost
                ? Number(values.shippingPerItemCost)
                : undefined,
              pickupAvailable: values.pickupAvailable,
            }
          : undefined;

      // Parse URL patterns
      const urlPatterns = values.urlPatterns.trim()
        ? values.urlPatterns
            .split(',')
            .map(pattern => pattern.trim())
            .filter(Boolean)
        : undefined;

      // Convert form values to validated supplier
      const supplierData: any = {
        name: values.name.trim(),
        countryCode: values.countryCode.trim().toUpperCase(),
        regionCode: values.regionCode.trim().toUpperCase() || undefined,
        storeCode: values.storeCode.trim() || undefined,
        defaultCurrency: values.defaultCurrency.trim().toUpperCase(),
        membershipRequired: values.membershipRequired,
        membershipType: values.membershipType.trim() || undefined,
        shippingPolicy,
        urlPatterns,
        notes: values.notes.trim() || undefined,
        created_at: initialValues?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      };

      // Only include ID for existing suppliers (editing)
      if (initialValues?.id) {
        supplierData.id = initialValues.id;
      }

      // Choose schema: create vs update
      const isEditingExisting = Boolean(initialValues?.id);
      const chosenSchema = isEditingExisting
        ? SupplierSchema
        : CreateSupplierSchema;
      const validationResult = chosenSchema.safeParse(supplierData);

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors
          .map(err => err.message)
          .join(', ');
        Alert.alert('Validation Error', errorMessages);
        return;
      }

      await onSubmit(
        validationResult.data as ValidatedSupplier | ValidatedNewSupplier as any
      );
    } catch {
      Alert.alert('Error', 'Failed to save supplier');
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
              {/* Supplier Name */}
              <View style={styles.firstFieldContainer}>
                <Input
                  label="Supplier Name"
                  required
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  placeholder="Enter supplier name"
                  error={errors.name && touched.name ? errors.name : undefined}
                />
              </View>

              {/* Country Code */}
              <View>
                <Input
                  label="Country Code"
                  required
                  value={values.countryCode}
                  onChangeText={text => {
                    const upperText = text.toUpperCase();
                    setFieldValue('countryCode', upperText);
                    setSelectedCountry(upperText);
                  }}
                  onBlur={handleBlur('countryCode')}
                  placeholder="e.g., CA, US, GB"
                  maxLength={2}
                  autoCapitalize="characters"
                  error={
                    errors.countryCode && touched.countryCode
                      ? errors.countryCode
                      : undefined
                  }
                />
                <View style={styles.chipContainer}>
                  {COMMON_COUNTRIES.map(country => (
                    <Chip
                      key={country}
                      label={country}
                      variant={
                        selectedCountry === country ? 'primary' : 'secondary'
                      }
                      onPress={() => {
                        setFieldValue('countryCode', country);
                        setSelectedCountry(country);
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Region Code */}
              <Input
                label="Region Code"
                value={values.regionCode}
                onChangeText={text =>
                  setFieldValue('regionCode', text.toUpperCase())
                }
                onBlur={handleBlur('regionCode')}
                placeholder="e.g., CA-NS, US-CA (optional)"
                autoCapitalize="characters"
                error={
                  errors.regionCode && touched.regionCode
                    ? errors.regionCode
                    : undefined
                }
              />

              {/* Store Code */}
              <Input
                label="Store Code"
                value={values.storeCode}
                onChangeText={handleChange('storeCode')}
                onBlur={handleBlur('storeCode')}
                placeholder="Internal store identifier (optional)"
              />

              {/* Default Currency */}
              <View>
                <Input
                  label="Default Currency"
                  required
                  value={values.defaultCurrency}
                  onChangeText={text => {
                    const upperText = text.toUpperCase();
                    setFieldValue('defaultCurrency', upperText);
                    setSelectedCurrency(upperText);
                  }}
                  onBlur={handleBlur('defaultCurrency')}
                  placeholder="e.g., CAD, USD, EUR"
                  maxLength={3}
                  autoCapitalize="characters"
                  error={
                    errors.defaultCurrency && touched.defaultCurrency
                      ? errors.defaultCurrency
                      : undefined
                  }
                />
                <View style={styles.chipContainer}>
                  {COMMON_CURRENCIES.map(currency => (
                    <Chip
                      key={currency}
                      label={currency}
                      variant={
                        selectedCurrency === currency ? 'primary' : 'secondary'
                      }
                      onPress={() => {
                        setFieldValue('defaultCurrency', currency);
                        setSelectedCurrency(currency);
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Membership Required */}
              <Switch
                label="Membership Required"
                value={values.membershipRequired}
                onValueChange={value =>
                  setFieldValue('membershipRequired', value)
                }
              />

              {/* Membership Type (conditional) */}
              {values.membershipRequired && (
                <Input
                  label="Membership Type"
                  value={values.membershipType}
                  onChangeText={handleChange('membershipType')}
                  onBlur={handleBlur('membershipType')}
                  placeholder="e.g., Gold Star, Executive"
                />
              )}

              {/* Shipping Policy Section */}
              <Text style={styles.sectionTitle}>Shipping Policy</Text>

              <Input
                label="Free Shipping Threshold"
                value={values.freeShippingThreshold}
                onChangeText={handleChange('freeShippingThreshold')}
                onBlur={handleBlur('freeShippingThreshold')}
                placeholder="Minimum order for free shipping"
                keyboardType="numeric"
                error={
                  errors.freeShippingThreshold && touched.freeShippingThreshold
                    ? errors.freeShippingThreshold
                    : undefined
                }
              />

              <Input
                label="Base Shipping Cost"
                value={values.shippingBaseCost}
                onChangeText={handleChange('shippingBaseCost')}
                onBlur={handleBlur('shippingBaseCost')}
                placeholder="Base shipping fee"
                keyboardType="numeric"
                error={
                  errors.shippingBaseCost && touched.shippingBaseCost
                    ? errors.shippingBaseCost
                    : undefined
                }
              />

              <Input
                label="Per-Item Shipping Cost"
                value={values.shippingPerItemCost}
                onChangeText={handleChange('shippingPerItemCost')}
                onBlur={handleBlur('shippingPerItemCost')}
                placeholder="Additional cost per item"
                keyboardType="numeric"
                error={
                  errors.shippingPerItemCost && touched.shippingPerItemCost
                    ? errors.shippingPerItemCost
                    : undefined
                }
              />

              <Switch
                label="Pickup Available"
                value={values.pickupAvailable}
                onValueChange={value => setFieldValue('pickupAvailable', value)}
              />

              {/* URL Patterns */}
              <Input
                label="URL Patterns"
                value={values.urlPatterns}
                onChangeText={handleChange('urlPatterns')}
                onBlur={handleBlur('urlPatterns')}
                placeholder="Comma-separated URL patterns"
                multiline
                numberOfLines={2}
                inputStyle={styles.textArea}
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
