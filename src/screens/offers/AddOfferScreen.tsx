import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Screen, Header } from '../../components/ui';
import { OfferForm } from '../../components/forms';
import {
  OfferInput,
  OfferRepository,
} from '../../storage/repositories/OfferRepository';
import { InventoryItem, Supplier, ProductVariant } from '../../storage/types';
import { RepositoryFactory } from '../../storage/RepositoryFactory';

interface AddOfferScreenProps {
  onBack: () => void;
  selectedVariant?: ProductVariant | null;
}

export const AddOfferScreen: React.FC<AddOfferScreenProps> = ({
  onBack,
  selectedVariant,
}) => {
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

        // Filter out deleted items and suppliers
        const activeItems = items.filter(item => !item.deleted_at);
        const activeSuppliers = suppliersList.filter(
          supplier => !supplier.deleted_at
        );

        // eslint-disable-next-line no-console
        console.log(
          'AddOfferScreen - Loaded inventory items:',
          activeItems.length,
          'of',
          items.length
        );
        // eslint-disable-next-line no-console
        console.log(
          'AddOfferScreen - Loaded suppliers:',
          activeSuppliers.length,
          'of',
          suppliersList.length
        );

        setInventoryItems(activeItems);
        setSuppliers(activeSuppliers);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load data:', error);
        Alert.alert('Error', 'Failed to load inventory items and stores');
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
            `Item: ${values.inventoryItemId}\n` +
            `Supplier: ${values.supplierNameSnapshot || values.supplierId}\n` +
            `Total Price: ${values.currency} ${values.totalPrice}\n` +
            `Amount: ${values.amount} ${values.amountUnit}\n` +
            `Canonical Amount: ${savedOffer?.amountCanonical?.toFixed(4) || 'N/A'}\n` +
            `Effective Price/Unit: ${values.currency} ${savedOffer?.effectivePricePerCanonical?.toFixed(4) || 'N/A'}`,
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

  // Create initial values based on selected variant
  const getInitialValues = (): Partial<OfferInput> | undefined => {
    if (!selectedVariant) return undefined;

    return {
      inventoryItemId: selectedVariant.inventoryItemId,
      amount: 1, // Default amount
      amountUnit: selectedVariant.unit,
      // Other fields will be left empty for user to fill
    };
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
        initialValues={getInitialValues()}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        availableInventoryItems={inventoryItems}
        availableSuppliers={suppliers}
        submitButtonText="Save Offer"
      />
    </Screen>
  );
};
