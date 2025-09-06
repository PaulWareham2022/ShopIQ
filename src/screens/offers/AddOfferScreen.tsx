import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Screen, Header } from '../../components/ui';
import { OfferForm } from '../../components/forms';
import {
  OfferInput,
  OfferRepository,
} from '../../storage/repositories/OfferRepository';
import { InventoryItem } from '../../storage/types';
import { Supplier } from '../../storage/types';
import { RepositoryFactory } from '../../storage/RepositoryFactory';

interface AddOfferScreenProps {
  onBack: () => void;
}

export const AddOfferScreen: React.FC<AddOfferScreenProps> = ({ onBack }) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get the repository factory instance (synchronous)
        const repositoryFactory = RepositoryFactory.getInstance();

        // Initialize the factory (async)
        await repositoryFactory.initialize();

        // Now get the repositories (async)
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
      // Get the repository factory instance (synchronous)
      const repositoryFactory = RepositoryFactory.getInstance();

      // Initialize the factory (async)
      await repositoryFactory.initialize();

      // Get the offer repository (async)
      const offerRepo =
        (await repositoryFactory.getOfferRepository()) as OfferRepository;

      // Use the repository's createOffer method which handles unit conversion and price computation
      const savedOffer = await offerRepo.createOffer(values);

      // Navigate back immediately for better UX
      onBack();

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Offer Saved Successfully!',
          `Offer has been saved with computed price metrics:\n\n` +
            `Item: ${values.inventory_item_id}\n` +
            `Supplier: ${values.supplier_name_snapshot || values.supplier_id}\n` +
            `Total Price: ${values.currency} ${values.total_price}\n` +
            `Amount: ${values.amount} ${values.amount_unit}\n` +
            `Canonical Amount: ${savedOffer.amount_canonical.toFixed(4)}\n` +
            `Effective Price/Unit: ${values.currency} ${savedOffer.effective_price_per_canonical.toFixed(4)}`,
          [{ text: 'OK' }]
        );
      }, 100);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save offer:', error);
      Alert.alert(
        'Error',
        `Failed to save offer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
      <Header title="Add New Offer" onBack={onBack} />
      <OfferForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        availableInventoryItems={inventoryItems}
        availableSuppliers={suppliers}
        submitButtonText="Save Offer"
      />
    </Screen>
  );
};
