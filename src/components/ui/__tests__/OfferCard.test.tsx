import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OfferCard } from '../OfferCard';
import { Offer } from '../../../storage/types';
import { ComparisonResult } from '../../../storage/comparison/types';

// Mock data
const mockOffer: Offer = {
  id: 'offer-1',
  inventoryItemId: 'item-1',
  supplierId: 'supplier-1',
  supplierNameSnapshot: 'Test Supplier',
  sourceType: 'manual',
  totalPrice: 10.99,
  currency: 'USD',
  amount: 2,
  amountUnit: 'kg',
  amountCanonical: 2,
  pricePerCanonicalExclShipping: 5.495,
  pricePerCanonicalInclShipping: 5.495,
  effectivePricePerCanonical: 5.495,
  shippingCost: 2.99,
  shippingIncluded: false,
  taxRate: 0.08,
  isTaxIncluded: false,
  qualityRating: 4,
  notes: 'Excellent product quality and fast delivery',
  observedAt: '2024-01-15T10:00:00Z',
  capturedAt: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  deleted_at: undefined,
};

const mockComparisonResult: ComparisonResult = {
  offer: mockOffer,
  score: 5.495,
  metadata: {
    scoreBreakdown: {
      basePrice: 10.99,
      shippingCost: 2.99,
      taxCost: 0.88,
      totalCost: 14.86,
      canonicalAmount: 2,
      pricePerCanonical: 5.495,
    },
    flags: ['shipping-included', 'high-quality'],
    explanation: 'Price per kg unit: 5.495',
    confidence: 0.95,
  },
};

describe('OfferCard', () => {
  it('renders offer information correctly', () => {
    const { getByText } = render(<OfferCard offer={mockOffer} />);

    expect(getByText('Test Supplier')).toBeTruthy();
    expect(getByText('USD 10.99')).toBeTruthy();
    expect(getByText('2 kg')).toBeTruthy();
    expect(getByText('✋ Manual')).toBeTruthy();
  });

  it('shows best offer badge when isBestOffer is true', () => {
    const { getByText } = render(
      <OfferCard offer={mockOffer} isBestOffer={true} />
    );

    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('shows tied badge when isTiedForBest is true', () => {
    const { getByText } = render(
      <OfferCard offer={mockOffer} isBestOffer={true} isTiedForBest={true} />
    );

    expect(getByText('🏆 Tied for Best')).toBeTruthy();
  });

  it('applies best offer styling when isBestOffer is true', () => {
    const { getByTestId } = render(
      <OfferCard offer={mockOffer} isBestOffer={true} testID="offer-card" />
    );

    const card = getByTestId('offer-card');
    // Check that the style array contains the expected styling
    expect(Array.isArray(card.props.style)).toBe(true);
    expect(card.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: expect.any(String),
        borderWidth: 2,
        backgroundColor: expect.any(String),
      })
    );
  });

  it('applies tied offer styling when isTiedForBest is true', () => {
    const { getByTestId } = render(
      <OfferCard offer={mockOffer} isTiedForBest={true} testID="offer-card" />
    );

    const card = getByTestId('offer-card');
    // Check that the style array contains the expected styling
    expect(Array.isArray(card.props.style)).toBe(true);
    expect(card.props.style).toContainEqual(
      expect.objectContaining({
        borderColor: expect.any(String),
        borderWidth: 2,
        backgroundColor: expect.any(String),
      })
    );
  });

  it('shows comparison details when showComparisonDetails is true', () => {
    const { getByText } = render(
      <OfferCard
        offer={mockOffer}
        comparisonResult={mockComparisonResult}
        showComparisonDetails={true}
      />
    );

    expect(getByText('Score:')).toBeTruthy();
    expect(getByText('5.4950')).toBeTruthy();
    expect(getByText('Confidence:')).toBeTruthy();
    expect(getByText('95%')).toBeTruthy();
    expect(getByText('Price per kg unit: 5.495')).toBeTruthy();
  });

  it('shows price breakdown when showPriceBreakdown is true', () => {
    const { getByText, getAllByText } = render(
      <OfferCard offer={mockOffer} showPriceBreakdown={true} />
    );

    expect(getByText('Price Breakdown:')).toBeTruthy();
    expect(getByText('Base Price:')).toBeTruthy();
    expect(getAllByText('USD 10.99')).toHaveLength(2); // One in header, one in breakdown
    expect(getByText('Shipping:')).toBeTruthy();
    expect(getByText('USD 2.99')).toBeTruthy();
  });

  it('displays flags as chips', () => {
    const { getByText } = render(
      <OfferCard offer={mockOffer} comparisonResult={mockComparisonResult} />
    );

    expect(getByText('shipping included')).toBeTruthy();
    expect(getByText('high quality')).toBeTruthy();
  });

  it('handles missing supplier name gracefully', () => {
    const offerWithoutSupplierName = {
      ...mockOffer,
      supplierNameSnapshot: undefined,
      supplierId: 'supplier-1',
    };

    const { getByText } = render(
      <OfferCard offer={offerWithoutSupplierName} />
    );

    expect(getByText('supplier-1')).toBeTruthy();
  });

  it('handles missing observed date gracefully', () => {
    const offerWithoutDate = {
      ...mockOffer,
      observedAt: '',
    };

    const { getByText } = render(<OfferCard offer={offerWithoutDate} />);

    expect(getByText('Observed: Unknown date')).toBeTruthy();
  });

  it('displays quality rating when available', () => {
    const { getByText, getByTestId } = render(
      <OfferCard offer={mockOffer} testID="offer-card" />
    );

    expect(getByText('Quality Rating:')).toBeTruthy();
    expect(getByTestId('offer-card-quality-rating')).toBeTruthy();
  });

  it('displays notes when available', () => {
    const { getByText } = render(<OfferCard offer={mockOffer} />);

    expect(getByText('Notes:')).toBeTruthy();
    expect(
      getByText('Excellent product quality and fast delivery')
    ).toBeTruthy();
  });

  it('does not display rating section when neither rating nor notes are available', () => {
    const offerWithoutRatingAndNotes = {
      ...mockOffer,
      qualityRating: undefined,
      notes: undefined,
    };

    const { queryByText } = render(
      <OfferCard offer={offerWithoutRatingAndNotes} />
    );

    expect(queryByText('Quality Rating:')).toBeNull();
    expect(queryByText('Notes:')).toBeNull();
  });

  it('handles invalid price values gracefully', () => {
    const offerWithInvalidPrice = {
      ...mockOffer,
      totalPrice: NaN,
    };

    const { getByText } = render(<OfferCard offer={offerWithInvalidPrice} />);

    expect(getByText('USD 0.00')).toBeTruthy();
  });

  it('calls onPress when offer is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <OfferCard
        offer={mockOffer}
        onPress={onPress}
        testID="offer-card-press"
      />
    );

    fireEvent.press(getByTestId('offer-card-press'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onLongPress when offer is long pressed', () => {
    const onLongPress = jest.fn();
    const { getByTestId } = render(
      <OfferCard
        offer={mockOffer}
        onLongPress={onLongPress}
        testID="offer-card-longpress"
      />
    );

    fireEvent(getByTestId('offer-card-longpress'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('shows price per canonical unit when available', () => {
    const { getByText } = render(<OfferCard offer={mockOffer} />);

    expect(getByText('Price per kg:')).toBeTruthy();
    expect(getByText('USD 5.50')).toBeTruthy();
  });

  it('handles offers with shipping included', () => {
    const offerWithShipping = {
      ...mockOffer,
      shippingIncluded: true,
    };

    const { getByText } = render(<OfferCard offer={offerWithShipping} />);

    expect(getByText('Free Shipping')).toBeTruthy();
  });

  it('handles offers with tax included', () => {
    const offerWithTax = {
      ...mockOffer,
      isTaxIncluded: true,
    };

    const { getByText } = render(<OfferCard offer={offerWithTax} />);

    expect(getByText('Tax Included')).toBeTruthy();
  });

  it('displays confidence level with appropriate color', () => {
    const { getByText } = render(
      <OfferCard
        offer={mockOffer}
        comparisonResult={mockComparisonResult}
        showComparisonDetails={true}
      />
    );

    const confidenceText = getByText('95%');
    expect(confidenceText).toBeTruthy();
    // Note: Color testing would require more complex setup in React Native Testing Library
  });

  it('handles comparison results with missing metadata', () => {
    const comparisonResultWithoutMetadata: ComparisonResult = {
      offer: mockOffer,
      score: 5.495,
    };

    const { getByText } = render(
      <OfferCard
        offer={mockOffer}
        comparisonResult={comparisonResultWithoutMetadata}
        showComparisonDetails={true}
      />
    );

    expect(getByText('Score:')).toBeTruthy();
    expect(getByText('5.4950')).toBeTruthy();
  });
});
