import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { initializeDatabase } from './src/storage/sqlite/database';
import { seedSampleSuppliers } from './src/storage/seed-suppliers';
import { seedSampleInventoryItems } from './src/storage/seed-inventory-items';
import { seedTestProducts } from './src/storage/seed-test-products';
import { colors } from './src/constants/colors';
import { InventoryListScreen } from './src/screens/inventory/InventoryListScreen';
import { InventoryItemDetailScreen } from './src/screens/inventory/InventoryItemDetailScreen';
import { InventoryComparisonScreen } from './src/screens/inventory/InventoryComparisonScreen';
import { SupplierListScreen } from './src/screens/suppliers/SupplierListScreen';
import { SupplierDetailScreen } from './src/screens/suppliers/SupplierDetailScreen';
import { AddOfferScreen } from './src/screens/offers/AddOfferScreen';
import { OfferListScreen } from './src/screens/offers/OfferListScreen';
import { BackupScreen } from './src/screens/BackupScreen';
import { BarcodeScannerScreen } from './src/screens/BarcodeScannerScreen';
import { InventoryItem, Supplier, ProductVariant } from './src/storage/types';

type Screen =
  | 'home'
  | 'inventory-list'
  | 'inventory-detail'
  | 'inventory-add'
  | 'inventory-comparison'
  | 'supplier-list'
  | 'supplier-detail'
  | 'supplier-add'
  | 'add-offer'
  | 'offer-list'
  | 'backup'
  | 'barcode-scanner';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [storageStatus, setStorageStatus] = useState<
    'testing' | 'success' | 'error'
  >('testing');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const initStorage = async () => {
      try {
        // Initialize database without running tests that create test suppliers
        await initializeDatabase();

        // Only seed sample data in development mode
        if (__DEV__) {
          // Seed sample suppliers for testing
          try {
            await seedSampleSuppliers();
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(
              'Sample suppliers already exist or seeding failed:',
              error
            );
          }

          // Seed sample inventory items for testing
          try {
            await seedSampleInventoryItems();
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(
              'Sample inventory items already exist or seeding failed:',
              error
            );
          }

          // Seed test products with known UPC codes for barcode scanner testing
          try {
            await seedTestProducts();
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(
              'Test products already exist or seeding failed:',
              error
            );
          }
        }

        setStorageStatus('success');
      } catch {
        // Error handling is done via UI state
        // Storage initialization failed - continuing in demo mode
        setStorageStatus('error');

        // For web development, still allow access to inventory
        // This is a temporary workaround for web testing
        if (__DEV__ && typeof window !== 'undefined') {
          setTimeout(() => {
            setStorageStatus('success');
          }, 2000);
        }
      }
    };

    initStorage();
  }, []);

  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setCurrentScreen('inventory-detail');
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setCurrentScreen('inventory-add');
  };

  const handleBackToList = () => {
    setCurrentScreen('inventory-list');
    setSelectedItem(null);
  };

  const handleItemSaved = () => {
    setCurrentScreen('inventory-list');
    setSelectedItem(null);
  };

  const handleViewOffers = (item: InventoryItem) => {
    setSelectedItem(item);
    setCurrentScreen('offer-list');
  };

  const handleViewComparison = (item: InventoryItem) => {
    setSelectedItem(item);
    setCurrentScreen('inventory-comparison');
  };

  // Supplier navigation handlers
  const handleSupplierPress = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setCurrentScreen('supplier-detail');
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setCurrentScreen('supplier-add');
  };

  const handleBackToSupplierList = () => {
    setCurrentScreen('supplier-list');
    setSelectedSupplier(null);
  };

  const handleSupplierSaved = () => {
    setCurrentScreen('supplier-list');
    setSelectedSupplier(null);
  };

  const renderHomeScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>ShopIQ</Text>
            <Text style={styles.subtitle}>Smart shopping comparisons</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCurrentScreen('inventory-list')}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>📦</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Products</Text>
              <Text style={styles.buttonSubtitle}>Manage your products</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCurrentScreen('supplier-list')}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>🏪</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Suppliers</Text>
              <Text style={styles.buttonSubtitle}>Manage your suppliers</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCurrentScreen('add-offer')}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>💰</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Add Offer</Text>
              <Text style={styles.buttonSubtitle}>
                Capture new price offers
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCurrentScreen('barcode-scanner')}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>📱</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Barcode Scanner</Text>
              <Text style={styles.buttonSubtitle}>
                Test UPC barcode scanning
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        {storageStatus === 'error' && (
          <Text style={styles.warningText}>
            Running in demo mode - data won't persist
          </Text>
        )}
      </View>

      {/* Three-dot menu modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setCurrentScreen('backup');
              }}
            >
              <Text style={styles.menuItemIcon}>💾</Text>
              <Text style={styles.menuItemText}>Backup & Restore</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <StatusBar style="auto" />
    </View>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return renderHomeScreen();
      case 'inventory-list':
        return (
          <InventoryListScreen
            key="inventory-list"
            onItemPress={handleItemPress}
            onAddItem={handleAddItem}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'inventory-detail':
        return (
          <InventoryItemDetailScreen
            key={`edit-${selectedItem?.id}`}
            itemId={selectedItem?.id}
            onBack={handleBackToList}
            onItemSaved={handleItemSaved}
            onViewOffers={handleViewOffers}
            onViewComparison={handleViewComparison}
          />
        );
      case 'inventory-add':
        return (
          <InventoryItemDetailScreen
            key="add-new-item"
            onBack={handleBackToList}
            onItemSaved={handleItemSaved}
          />
        );
      case 'supplier-list':
        return (
          <SupplierListScreen
            key="supplier-list"
            onSupplierPress={handleSupplierPress}
            onAddSupplier={handleAddSupplier}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'supplier-detail':
        return (
          <SupplierDetailScreen
            key={`edit-${selectedSupplier?.id}`}
            supplierId={selectedSupplier?.id}
            onBack={handleBackToSupplierList}
            onSupplierSaved={handleSupplierSaved}
          />
        );
      case 'supplier-add':
        return (
          <SupplierDetailScreen
            key="add-new-supplier"
            onBack={handleBackToSupplierList}
            onSupplierSaved={handleSupplierSaved}
          />
        );
      case 'add-offer':
        return (
          <AddOfferScreen
            key="add-offer"
            onBack={() => {
              setSelectedVariant(null);
              setCurrentScreen('home');
            }}
            selectedVariant={selectedVariant}
          />
        );
      case 'inventory-comparison':
        return selectedItem ? (
          <InventoryComparisonScreen
            key={`comparison-${selectedItem.id}`}
            inventoryItem={selectedItem}
            onBack={handleBackToList}
            onAddOffer={() => setCurrentScreen('add-offer')}
          />
        ) : (
          renderHomeScreen()
        );
      case 'offer-list':
        return selectedItem ? (
          <OfferListScreen
            key={`offers-${selectedItem.id}`}
            inventoryItem={selectedItem}
            onBack={handleBackToList}
            onAddOffer={() => setCurrentScreen('add-offer')}
          />
        ) : (
          renderHomeScreen()
        );
      case 'backup':
        return (
          <BackupScreen key="backup" onBack={() => setCurrentScreen('home')} />
        );
      case 'barcode-scanner':
        return (
          <BarcodeScannerScreen
            key="barcode-scanner"
            onBack={() => setCurrentScreen('home')}
            onVariantFound={(variant) => {
              setSelectedVariant(variant);
              setCurrentScreen('add-offer');
            }}
          />
        );
      default:
        return renderHomeScreen();
    }
  };

  const screenToRender = renderCurrentScreen();
  return screenToRender;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray || '#F2F2F7', // iOS system background
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: -8, // Align with the right edge
  },
  menuIcon: {
    fontSize: 32,
    color: colors.darkText,
    fontWeight: '900',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.grayText,
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.darkText || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  buttonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: colors.grayText,
  },
  chevron: {
    fontSize: 24,
    color: colors.grayText,
    fontWeight: '300',
  },
  warningText: {
    color: colors.warning || '#FF9500',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Menu modal styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: colors.darkText || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray || '#F2F2F7',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.darkText,
    fontWeight: '500',
  },
});
