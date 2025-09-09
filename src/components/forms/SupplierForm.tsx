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
import { OptimizedButton } from '../ui/OptimizedButton';
import { OptimizedInput } from '../ui/OptimizedInput';
import { OptimizedSwitch } from '../ui/OptimizedSwitch';
import { Chip } from '../ui/Chip';
import { StarRatingInput } from '../ui';
import { useFormFocus } from '../../hooks/useFormFocus';

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
  rating: number;
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
  const scrollViewRef = useRef<ScrollView>(null);

  // Form focus management
  const fieldOrder = [
    'name',
    'countryCode',
    'regionCode',
    'storeCode',
    'defaultCurrency',
    'membershipType',
    'freeShippingThreshold',
    'shippingBaseCost',
    'shippingPerItemCost',
    'urlPatterns',
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
    rating: initialValues?.rating || 0,
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

    // Validate rating
    if (values.rating < 0 || values.rating > 5) {
      errors.rating = 'Rating must be between 0 and 5';
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
        rating: values.rating > 0 ? values.rating : undefined,
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
                  Use keyboard "Next" button to move between fields • Country and currency codes auto-format
                </Text>
              </View>

              {/* Supplier Name */}
              <View style={styles.firstFieldContainer}>
                <OptimizedInput
                  label="Supplier Name"
                  required
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  placeholder="Enter supplier name"
                  returnKeyType="next"
                  fieldName="name"
                  onSubmitEditing={formFocus.handleSubmitEditing}
                  onFocus={formFocus.handleFieldFocus}
                  error={errors.name && touched.name ? errors.name : undefined}
                />
              </View>

              {/* Country Code */}
              <View>
                <OptimizedInput
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
                  returnKeyType="next"
                  fieldName="countryCode"
                  onSubmitEditing={formFocus.handleSubmitEditing}
                  onFocus={formFocus.handleFieldFocus}
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
              <OptimizedInput
                label="Region Code"
                value={values.regionCode}
                onChangeText={text =>
                  setFieldValue('regionCode', text.toUpperCase())
                }
                onBlur={handleBlur('regionCode')}
                placeholder="e.g., CA-NS, US-CA (optional)"
                autoCapitalize="characters"
                returnKeyType="next"
                fieldName="regionCode"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
                error={
                  errors.regionCode && touched.regionCode
                    ? errors.regionCode
                    : undefined
                }
              />

              {/* Store Code */}
              <OptimizedInput
                label="Store Code"
                value={values.storeCode}
                onChangeText={handleChange('storeCode')}
                onBlur={handleBlur('storeCode')}
                placeholder="Internal store identifier (optional)"
                returnKeyType="next"
                fieldName="storeCode"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
              />

              {/* Default Currency */}
              <View>
                <OptimizedInput
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
                  returnKeyType="next"
                  fieldName="defaultCurrency"
                  onSubmitEditing={formFocus.handleSubmitEditing}
                  onFocus={formFocus.handleFieldFocus}
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
              <OptimizedSwitch
                label="Membership Required"
                value={values.membershipRequired}
                onValueChange={value =>
                  setFieldValue('membershipRequired', value)
                }
              />

              {/* Membership Type (conditional) */}
              {values.membershipRequired && (
                <OptimizedInput
                  label="Membership Type"
                  value={values.membershipType}
                  onChangeText={handleChange('membershipType')}
                  onBlur={handleBlur('membershipType')}
                  placeholder="e.g., Gold Star, Executive"
                  returnKeyType="next"
                  fieldName="membershipType"
                  onSubmitEditing={formFocus.handleSubmitEditing}
                  onFocus={formFocus.handleFieldFocus}
                />
              )}

              {/* Shipping Policy Section */}
              <Text style={styles.sectionTitle}>Shipping Policy</Text>

              <OptimizedInput
                label="Free Shipping Threshold"
                value={values.freeShippingThreshold}
                onChangeText={handleChange('freeShippingThreshold')}
                onBlur={handleBlur('freeShippingThreshold')}
                placeholder="Minimum order for free shipping"
                keyboardType="numeric"
                returnKeyType="next"
                fieldName="freeShippingThreshold"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
                error={
                  errors.freeShippingThreshold && touched.freeShippingThreshold
                    ? errors.freeShippingThreshold
                    : undefined
                }
              />

              <OptimizedInput
                label="Base Shipping Cost"
                value={values.shippingBaseCost}
                onChangeText={handleChange('shippingBaseCost')}
                onBlur={handleBlur('shippingBaseCost')}
                placeholder="Base shipping fee"
                keyboardType="numeric"
                returnKeyType="next"
                fieldName="shippingBaseCost"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
                error={
                  errors.shippingBaseCost && touched.shippingBaseCost
                    ? errors.shippingBaseCost
                    : undefined
                }
              />

              <OptimizedInput
                label="Per-Item Shipping Cost"
                value={values.shippingPerItemCost}
                onChangeText={handleChange('shippingPerItemCost')}
                onBlur={handleBlur('shippingPerItemCost')}
                placeholder="Additional cost per item"
                keyboardType="numeric"
                returnKeyType="next"
                fieldName="shippingPerItemCost"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
                error={
                  errors.shippingPerItemCost && touched.shippingPerItemCost
                    ? errors.shippingPerItemCost
                    : undefined
                }
              />

              <OptimizedSwitch
                label="Pickup Available"
                value={values.pickupAvailable}
                onValueChange={value => setFieldValue('pickupAvailable', value)}
              />

              {/* URL Patterns */}
              <OptimizedInput
                label="URL Patterns"
                value={values.urlPatterns}
                onChangeText={handleChange('urlPatterns')}
                onBlur={handleBlur('urlPatterns')}
                placeholder="Comma-separated URL patterns"
                multiline
                numberOfLines={2}
                inputStyle={styles.textArea}
                returnKeyType="next"
                fieldName="urlPatterns"
                onSubmitEditing={formFocus.handleSubmitEditing}
                onFocus={formFocus.handleFieldFocus}
              />

              {/* Rating Section */}
              <Text style={styles.sectionTitle}>Quality Rating</Text>
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>
                  Rate this supplier (1-5 stars)
                </Text>
                <StarRatingInput
                  rating={values.rating}
                  onRatingChange={rating => setFieldValue('rating', rating)}
                  starSize={28}
                  testID="supplier-form-rating"
                />
                {values.rating > 0 && (
                  <Text style={styles.ratingDescription}>
                    {values.rating === 1 && 'Poor quality'}
                    {values.rating === 2 && 'Below average'}
                    {values.rating === 3 && 'Average quality'}
                    {values.rating === 4 && 'Good quality'}
                    {values.rating === 5 && 'Excellent quality'}
                  </Text>
                )}
              </View>

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
            />

            <OptimizedButton
              title={submitButtonText}
              variant="primary"
              onPress={() => handleSubmit()}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.submitButton}
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
    backgroundColor: '#F8F9FA',
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
  ratingSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkText,
    marginBottom: 12,
  },
  ratingDescription: {
    fontSize: 14,
    color: colors.grayText,
    marginTop: 8,
    fontStyle: 'italic',
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
});
