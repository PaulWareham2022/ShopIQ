import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../constants/colors';
import { ProductVariant } from '../storage/types';
import { getRepositoryFactory } from '../storage/RepositoryFactory';
import { ProductVariantRepository } from '../storage/repositories/ProductVariantRepository';

interface BarcodeScannerScreenProps {
  onBack: () => void;
  onVariantFound?: (variant: ProductVariant) => void;
}

interface ScannedBarcode {
  data: string;
  type: string;
  timestamp: Date;
}

export function BarcodeScannerScreen({ onBack, onVariantFound }: BarcodeScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedBarcodes, setScannedBarcodes] = useState<ScannedBarcode[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanResult, setShowScanResult] = useState(false);
  const [currentScan, setCurrentScan] = useState<ScannedBarcode | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [foundVariant, setFoundVariant] = useState<ProductVariant | null>(null);
  const [isLookingUpVariant, setIsLookingUpVariant] = useState(false);

  // Use ref for immediate state tracking to prevent race conditions
  const isScanningRef = useRef(false);
  const lastDataRef = useRef('');

  const hasPermission = permission?.granted ?? null;

  // Function to lookup product variant by barcode
  const lookupVariantByBarcode = async (barcodeValue: string): Promise<ProductVariant | null> => {
    try {
      const factory = getRepositoryFactory();
      const variantRepo = await factory.getProductVariantRepository() as ProductVariantRepository;
      const variant = await variantRepo.findByBarcodeValue(barcodeValue);
      return variant;
    } catch (error) {
      console.error('Error looking up variant:', error);
      return null;
    }
  };

  // Request camera permission when component mounts
  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      // Permission was denied and can't ask again
      return;
    }

    if (permission && !permission.granted) {
      // Request permission if not granted
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    // Immediate check using refs to prevent race conditions
    if (isScanningRef.current || data === lastDataRef.current) {
      return;
    }

    // Immediately set refs to block further scans
    isScanningRef.current = true;
    lastDataRef.current = data;

    const currentTime = Date.now();

    // Additional checks for state-based blocking
    if (scanned || isProcessing || currentTime - lastScanTime < 1000) {
      // Reset refs if we're not actually processing
      isScanningRef.current = false;
      return;
    }

    setIsProcessing(true);
    setScanned(true);
    setLastScanTime(currentTime);

    const newBarcode: ScannedBarcode = {
      data,
      type,
      timestamp: new Date(),
    };

    setCurrentScan(newBarcode);
    setScannedBarcodes(prev => [newBarcode, ...prev]);

    // Automatically copy barcode data to clipboard
    Clipboard.setStringAsync(data)
      .then(() => {
        setCopiedToClipboard(true);
      })
      .catch(() => {
        setCopiedToClipboard(false);
      });

    // Lookup variant by barcode
    setIsLookingUpVariant(true);
    const variant = await lookupVariantByBarcode(data);
    setFoundVariant(variant);
    setIsLookingUpVariant(false);

    setShowScanResult(true);
  };

  const handleScanAnother = () => {
    setShowScanResult(false);
    setScanned(false);
    setIsProcessing(false);
    setCurrentScan(null);
    setFoundVariant(null);
    setIsLookingUpVariant(false);
    // Reset the last scanned data to allow scanning the same barcode again
    setLastScanTime(0); // Reset the timing to allow immediate scanning
    setCopiedToClipboard(false); // Reset clipboard state

    // Reset refs to allow new scanning
    isScanningRef.current = false;
    lastDataRef.current = '';
  };

  const handleDone = () => {
    setShowScanResult(false);
    setIsProcessing(false);
    setCurrentScan(null);
    setFoundVariant(null);
    setIsLookingUpVariant(false);
    setLastScanTime(0);
    setCopiedToClipboard(false);

    // Reset refs
    isScanningRef.current = false;
    lastDataRef.current = '';

    onBack();
  };

  const clearHistory = () => {
    setScannedBarcodes([]);
    setShowHistory(false);
  };

  const openGoUPC = () => {
    if (currentScan) {
      const url = `https://go-upc.com/search?q=${currentScan.data}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open browser. Please try again.');
      });
    }
  };

  const handleCreateOffer = () => {
    if (foundVariant && onVariantFound) {
      onVariantFound(foundVariant);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Barcode Scanner</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Barcode Scanner</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.message}>No access to camera</Text>
          <Text style={styles.subMessage}>
            Please enable camera permissions in your device settings to use the
            barcode scanner.
          </Text>
          {permission?.canAskAgain && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>
                Request Permission
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Barcode Scanner</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(true)}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={
            scanned || isProcessing ? undefined : handleBarCodeScanned
          }
          barcodeScannerSettings={{
            barcodeTypes: [
              'upc_a',
              'upc_e',
              'ean13',
              'ean8',
              'qr',
              'code39',
              'code128',
              'pdf417',
            ],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructionText}>
            {isProcessing
              ? isLookingUpVariant
                ? 'Looking up product...'
                : 'Processing scan...'
              : 'Point your camera at a barcode'}
          </Text>
        </View>
      </View>

      {scanned && !isProcessing && (
        <View style={styles.scanAgainContainer}>
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => {
              setScanned(false);
              setIsProcessing(false);
            }}
          >
            <Text style={styles.scanAgainButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History Modal */}
      <Modal
        visible={showHistory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan History</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowHistory(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {scannedBarcodes.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>
                  No barcodes scanned yet
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.historyList}>
                  {scannedBarcodes.map((barcode, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyItemType}>
                          {barcode.type}
                        </Text>
                        <Text style={styles.historyItemTime}>
                          {barcode.timestamp.toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={styles.historyItemData}>{barcode.data}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearHistory}
                >
                  <Text style={styles.clearButtonText}>Clear History</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Scan Result Modal */}
      <Modal
        visible={showScanResult}
        transparent={true}
        animationType="fade"
        onRequestClose={handleScanAnother}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scanResultContainer}>
            <Text style={styles.scanResultTitle}>Barcode Scanned!</Text>

            {currentScan && (
              <View style={styles.scanResultContent}>
                <Text style={styles.scanResultType}>
                  {currentScan.type.toUpperCase()}
                </Text>
                <Text style={styles.scanResultData}>{currentScan.data}</Text>
                {copiedToClipboard && (
                  <Text style={styles.clipboardStatus}>
                    ✓ Copied to clipboard
                  </Text>
                )}
                
                {/* Variant Information */}
                {foundVariant && (
                  <View style={styles.variantInfoContainer}>
                    <Text style={styles.variantInfoTitle}>Product Found!</Text>
                    <Text style={styles.variantInfoText}>
                      Package Size: {foundVariant.packageSize} {foundVariant.unit}
                    </Text>
                    {foundVariant.notes && (
                      <Text style={styles.variantInfoNotes}>
                        Notes: {foundVariant.notes}
                      </Text>
                    )}
                  </View>
                )}
                
                {!foundVariant && !isLookingUpVariant && (
                  <View style={styles.noVariantContainer}>
                    <Text style={styles.noVariantText}>
                      No product variant found for this barcode
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.scanResultButtons}>
              <TouchableOpacity
                style={styles.scanResultButton}
                onPress={handleScanAnother}
              >
                <Text style={styles.scanResultButtonText}>Scan Another</Text>
              </TouchableOpacity>
              
              {foundVariant && onVariantFound && (
                <TouchableOpacity
                  style={[styles.scanResultButton, styles.createOfferButton]}
                  onPress={handleCreateOffer}
                >
                  <Text
                    style={[styles.scanResultButtonText, styles.createOfferButtonText]}
                  >
                    Create Offer
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.scanResultButton, styles.lookupButton]}
                onPress={openGoUPC}
              >
                <Text
                  style={[styles.scanResultButtonText, styles.lookupButtonText]}
                >
                  Lookup Product
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scanResultButton, styles.doneButton]}
                onPress={handleDone}
              >
                <Text
                  style={[styles.scanResultButtonText, styles.doneButtonText]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray || '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray || '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  placeholder: {
    width: 60, // Same width as back button to center title
  },
  historyButton: {
    padding: 8,
  },
  historyButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: colors.grayText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Allow touches to pass through to camera
  },
  scanArea: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructionText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanAgainContainer: {
    padding: 20,
    backgroundColor: colors.white,
  },
  scanAgainButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanAgainButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray || '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.grayText,
  },
  emptyHistory: {
    padding: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 16,
    color: colors.grayText,
    textAlign: 'center',
  },
  historyList: {
    maxHeight: 400,
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray || '#E5E5EA',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyItemType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  historyItemTime: {
    fontSize: 12,
    color: colors.grayText,
  },
  historyItemData: {
    fontSize: 16,
    color: colors.darkText,
    fontFamily: 'monospace',
  },
  clearButton: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.lightGray || '#F2F2F7',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: colors.grayText,
    fontWeight: '600',
  },
  // Scan Result Modal styles
  scanResultContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    margin: 40,
    maxWidth: 320,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scanResultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkText,
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  scanResultContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  scanResultType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  scanResultData: {
    fontSize: 18,
    color: colors.darkText,
    fontFamily: 'monospace',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: colors.lightGray || '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 200,
    marginBottom: 8,
  },
  clipboardStatus: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanResultButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.lightGray || '#E5E5EA',
  },
  scanResultButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray || '#E5E5EA',
  },
  scanResultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grayText,
  },
  lookupButton: {
    backgroundColor: colors.lightGray || '#F2F2F7',
  },
  lookupButtonText: {
    color: colors.primary,
  },
  doneButton: {
    borderRightWidth: 0,
  },
  doneButtonText: {
    color: colors.primary,
  },
  // Variant information styles
  variantInfoContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  variantInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
    textAlign: 'center',
  },
  variantInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 4,
  },
  variantInfoNotes: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noVariantContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  noVariantText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
  },
  createOfferButton: {
    backgroundColor: '#4CAF50',
  },
  createOfferButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});
