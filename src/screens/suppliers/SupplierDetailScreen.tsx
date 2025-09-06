import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Platform } from 'react-native';
import { colors } from '../../constants/colors';
import { SupplierRepository } from '../../storage/repositories/SupplierRepository';
import { Supplier } from '../../storage/types';
import { SupplierForm } from '../../components/forms/SupplierForm';
import { ValidatedSupplier } from '../../storage/validation/schemas';
import { Screen, Header, Button } from '../../components/ui';

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
});
