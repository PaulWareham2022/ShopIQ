import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Platform } from 'react-native';
import { colors } from '../../constants/colors';
import { SupplierRepository } from '../../storage/repositories/SupplierRepository';
import { Supplier } from '../../storage/types';
import { SupplierForm } from '../../components/forms/SupplierForm';
import { ValidatedSupplier } from '../../storage/validation/schemas';
import { Screen, Header, Button, SupplierRating, StarRatingInput } from '../../components/ui';
import { fixRatingColumn } from '../../storage/fix-rating-column';

interface SupplierDetailScreenProps {
  supplierId?: string;
  onBack: () => void;
  onSupplierSaved: () => void;
}

export const SupplierDetailScreen: React.FC<SupplierDetailScreenProps> = ({
  supplierId,
  onBack,
  onSupplierSaved,
}) => {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = useState(!supplierId); // New supplier if no ID provided
  const [loading, setLoading] = useState(!!supplierId); // Only load if editing existing supplier
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [repository] = useState(() => new SupplierRepository());

  const loadSupplier = useCallback(async () => {
    try {
      setLoading(true);
      const foundSupplier = await repository.findById(supplierId!);
      if (foundSupplier) {
        setSupplier(foundSupplier);
      } else {
        Alert.alert('Error', 'Supplier not found');
        onBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to load supplier');
      onBack();
    } finally {
      setLoading(false);
    }
  }, [supplierId, repository, onBack]);

  useEffect(() => {
    if (supplierId) {
      loadSupplier();
    }
  }, [supplierId, loadSupplier]);

  const handleSave = async (values: ValidatedSupplier) => {
    try {
      const supplierData = {
        name: values.name,
        countryCode: values.countryCode,
        regionCode: values.regionCode,
        storeCode: values.storeCode,
        defaultCurrency: values.defaultCurrency,
        membershipRequired: values.membershipRequired,
        membershipType: values.membershipType,
        shippingPolicy: values.shippingPolicy,
        urlPatterns: values.urlPatterns,
        notes: values.notes,
        rating: values.rating,
      };

      if (supplierId) {
        await repository.update(supplierId, supplierData);
        Alert.alert('Success', 'Supplier updated successfully!');
      } else {
        await repository.create(supplierData);
        Alert.alert('Success', 'Supplier created successfully!');
      }
      onSupplierSaved();
    } catch {
      Alert.alert('Error', 'Failed to save supplier');
    }
  };

  const handleRatingUpdate = async (newRating: number) => {
    if (!supplier) return;
    
    try {
      const updatedSupplier = await repository.update(supplier.id, { rating: newRating });
      if (updatedSupplier) {
        setSupplier(updatedSupplier);
        setIsEditingRating(false);
      } else {
        // Rating update was skipped (column doesn't exist)
        Alert.alert(
          'Rating Not Available', 
          'Rating functionality is not available in this version. Please update the app to use rating features.'
        );
      }
    } catch (error) {
      console.error('Rating update error:', error);
      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      if (error.message) {
        if (error.message.includes('no such column') || error.message.includes('database needs to be updated')) {
          errorMessage = 'Rating feature is not available. The database needs to be updated.';
          // Offer to fix the issue
          Alert.alert(
            'Rating Not Available',
            'The rating feature is not available because the database needs to be updated. Would you like to try to fix this now?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Fix Now', onPress: handleFixRatingColumn }
            ]
          );
          return;
        } else if (error.message.includes('CHECK constraint')) {
          errorMessage = 'Invalid rating value. Please select a rating between 0-5.';
        } else {
          errorMessage = error.message;
        }
      }
      Alert.alert('Error', `Failed to update rating: ${errorMessage}`);
    }
  };

  const handleFixRatingColumn = async () => {
    try {
      Alert.alert('Fixing Rating Column', 'Attempting to fix the rating column...');
      const result = await fixRatingColumn();
      
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Failed', result.message);
      }
    } catch (error) {
      console.error('Failed to fix rating column:', error);
      Alert.alert('Error', 'Failed to fix rating column. Please try again or contact support.');
    }
  };

  const handleDelete = () => {
    if (!supplier) return;

    // React Native Web's Alert has limited button support. Use confirm() on web.
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Delete "${supplier.name}"? This action cannot be undone.`
      );
      if (!confirmed) return;
      (async () => {
        try {
          await repository.delete(supplier.id);
          onSupplierSaved();
        } catch {
          Alert.alert('Error', 'Failed to delete supplier');
        }
      })();
      return;
    }

    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await repository.delete(supplier.id);
              onSupplierSaved();
            } catch {
              Alert.alert('Error', 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Loading..." onBack={onBack} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading supplier...</Text>
        </View>
      </Screen>
    );
  }

  if (isEditing) {
    return (
      <Screen>
        <Header
          title={supplierId ? 'Edit Supplier' : 'Add New Supplier'}
          onBack={onBack}
        />
        <SupplierForm
          initialValues={supplier || undefined}
          onSubmit={handleSave}
          onCancel={onBack}
          submitButtonText={supplierId ? 'Update Supplier' : 'Add Supplier'}
        />
      </Screen>
    );
  }

  // View mode
  return (
    <Screen scrollable>
      <Header
        title="Supplier Details"
        onBack={onBack}
        actionTitle="Edit"
        onAction={() => setIsEditing(true)}
      />

      <View style={styles.content}>
        <View style={styles.detailCard}>
          <Text style={styles.supplierName}>{supplier?.name}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Country:</Text>
            <Text style={styles.detailValue}>{supplier?.countryCode}</Text>
          </View>

          {supplier?.regionCode && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Region:</Text>
              <Text style={styles.detailValue}>{supplier.regionCode}</Text>
            </View>
          )}

          {supplier?.storeCode && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Store Code:</Text>
              <Text style={styles.detailValue}>{supplier.storeCode}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Currency:</Text>
            <Text style={styles.detailValue}>{supplier?.defaultCurrency}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Membership Required:</Text>
            <Text style={styles.detailValue}>
              {supplier?.membershipRequired ? 'Yes' : 'No'}
            </Text>
          </View>

          {supplier?.membershipType && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Membership Type:</Text>
              <Text style={styles.detailValue}>{supplier.membershipType}</Text>
            </View>
          )}

          {supplier?.shippingPolicy && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shipping Policy:</Text>
              <View style={styles.shippingPolicyContainer}>
                {supplier.shippingPolicy.freeShippingThreshold && (
                  <Text style={styles.shippingPolicyItem}>
                    🚚 Free shipping on orders over $
                    {supplier.shippingPolicy.freeShippingThreshold}
                  </Text>
                )}
                {supplier.shippingPolicy.shippingBaseCost && (
                  <Text style={styles.shippingPolicyItem}>
                    📦 Base shipping cost: $
                    {supplier.shippingPolicy.shippingBaseCost}
                  </Text>
                )}
                {supplier.shippingPolicy.shippingPerItemCost && (
                  <Text style={styles.shippingPolicyItem}>
                    📋 Per-item cost: $
                    {supplier.shippingPolicy.shippingPerItemCost}
                  </Text>
                )}
                {supplier.shippingPolicy.pickupAvailable && (
                  <Text style={styles.shippingPolicyItem}>
                    🏪 Store pickup available
                  </Text>
                )}
              </View>
            </View>
          )}

          {supplier?.urlPatterns && supplier.urlPatterns.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>URL Patterns:</Text>
              <Text style={styles.detailValue}>
                {supplier.urlPatterns.join(', ')}
              </Text>
            </View>
          )}

          {supplier?.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>{supplier.notes}</Text>
            </View>
          )}

          {/* Rating Section - Updated Layout */}
          <View style={styles.ratingRow}>
            <Text style={styles.detailLabel}>Rating:</Text>
            <View style={styles.ratingSection}>
              {isEditingRating ? (
                <View style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  width: '100%',
                  gap: 16,
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: colors.grayText,
                    marginBottom: 8,
                    fontWeight: '500',
                  }}>Tap a star to rate:</Text>
                  <View style={{
                    width: '100%',
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                  }}>
                    <StarRatingInput
                      rating={supplier?.rating || 0}
                      onRatingChange={handleRatingUpdate}
                      starSize={32}
                      showNoRating={false}
                      testID="supplier-rating-edit"
                    />
                  </View>
                  <View style={{
                    alignSelf: 'flex-end',
                    marginTop: 8,
                  }}>
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => setIsEditingRating(false)}
                      style={styles.ratingButton}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.ratingDisplayContainer}>
                  {supplier?.rating ? (
                    <>
                      <SupplierRating
                        rating={supplier.rating}
                        starSize={20}
                        showRatingNumber={true}
                        testID="supplier-rating-display"
                      />
                      <Button
                        title="Edit"
                        variant="secondary"
                        onPress={() => setIsEditingRating(true)}
                        style={styles.ratingButton}
                      />
                    </>
                  ) : (
                    <View style={styles.ratingDisplayContainer}>
                      <SupplierRating
                        rating={0}
                        starSize={20}
                        showRatingNumber={false}
                        testID="supplier-rating-empty"
                      />
                      <TouchableOpacity
                        onPress={() => setIsEditingRating(true)}
                        style={styles.addRatingButton}
                        testID="add-rating-button"
                      >
                        <Text style={styles.addRatingIcon}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {supplier?.created_at
                ? new Date(supplier.created_at).toLocaleDateString()
                : 'Unknown'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>
              {supplier?.updated_at
                ? new Date(supplier.updated_at).toLocaleDateString()
                : 'Unknown'}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Delete Supplier"
            variant="danger"
            onPress={handleDelete}
            style={styles.deleteButton}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.grayText,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  supplierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grayText,
    width: 140,
  },
  detailValue: {
    fontSize: 16,
    color: colors.darkText,
    flex: 1,
  },
  shippingPolicyContainer: {
    flex: 1,
  },
  shippingPolicyItem: {
    fontSize: 15,
    color: colors.darkText,
    marginBottom: 6,
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 20,
  },
  deleteButton: {
    marginTop: 0,
  },
  ratingRow: {
    marginBottom: 16, // Give more space for the rating section
  },
  ratingSection: {
    flex: 1,
    minWidth: 0, // Allow flex shrinking
  },
  ratingDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 70,
    flexShrink: 0,
  },
  addRatingButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addRatingIcon: {
    fontSize: 18,
    fontWeight: '300',
    color: colors.white,
    lineHeight: 18,
  },
});
