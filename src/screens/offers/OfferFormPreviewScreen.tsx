import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Screen, Header } from '../../components/ui';
import { OfferForm } from '../../components/forms';
import { OfferInput } from '../../storage/repositories/OfferRepository';
import { InventoryItem } from '../../storage/types';
import { Supplier } from '../../storage/types';
import { RepositoryFactory } from '../../storage/RepositoryFactory';

interface OfferFormPreviewScreenProps {
  onBack: () => void;
}

export const OfferFormPreviewScreen: React.FC<OfferFormPreviewScreenProps> = ({
  onBack,
}) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const repositoryFactory = await RepositoryFactory.getInstance();
        const inventoryRepo =
          await repositoryFactory.getInventoryItemRepository();
        const supplierRepo = await repositoryFactory.getSupplierRepository();

        const [items, suppliersList] = await Promise.all([
          inventoryRepo.findAll(),
          supplierRepo.findAll(),
        ]);

        setInventoryItems(items);
        setSuppliers(suppliersList);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load data:', error);
        Alert.alert('Error', 'Failed to load inventory items and suppliers');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (values: OfferInput) => {
    try {
      // For preview purposes, just show the submitted data
      Alert.alert(
        'Form Submitted!',
        `This is a preview. In the real app, this would save:\n\n` +
          `Item: ${values.inventory_item_id}\n` +
          `Supplier: ${values.supplier_id}\n` +
          `Price: ${values.currency} ${values.total_price}\n` +
          `Amount: ${values.amount} ${values.amount_unit}`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'Failed to submit offer');
    }
  };

  const handleCancel = () => {
    onBack();
  };

  if (loading) {
    return (
      <Screen backgroundColor="#F8F9FA">
        <Header title="Loading..." onBack={onBack} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#F8F9FA">
      <Header title="Offer Form Preview" onBack={onBack} />
      <OfferForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        availableInventoryItems={inventoryItems}
        availableSuppliers={suppliers}
        submitButtonText="Preview Submit"
      />
    </Screen>
  );
};
