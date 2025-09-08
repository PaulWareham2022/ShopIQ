import React from 'react';
import { render } from '@testing-library/react-native';
import { BestOfferBadge, StandaloneBestOfferBadge } from '../BestOfferBadge';

describe('BestOfferBadge', () => {
  it('renders nothing when isBestOffer is false', () => {
    const { queryByText } = render(
      <BestOfferBadge isBestOffer={false} testID="test-badge" />
    );

    expect(queryByText('🏆 Best Offer')).toBeNull();
  });

  it('renders best offer badge when isBestOffer is true', () => {
    const { getByText } = render(
      <BestOfferBadge isBestOffer={true} testID="test-badge" />
    );

    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('renders tied badge when isTiedForBest is true', () => {
    const { getByText } = render(
      <BestOfferBadge
        isBestOffer={true}
        isTiedForBest={true}
        testID="test-badge"
      />
    );

    expect(getByText('🏆 Tied for Best')).toBeTruthy();
  });

  it('renders custom text when provided', () => {
    const { getByText } = render(
      <BestOfferBadge
        isBestOffer={true}
        customText="Custom Badge Text"
        testID="test-badge"
      />
    );

    expect(getByText('Custom Badge Text')).toBeTruthy();
  });

  it('renders with different variants', () => {
    const { getByText: getByTextSavings } = render(
      <BestOfferBadge
        isBestOffer={true}
        variant="savings"
        testID="test-badge-savings"
      />
    );

    expect(getByTextSavings('💰 Best Value')).toBeTruthy();

    const { getByText: getByTextTied } = render(
      <BestOfferBadge
        isBestOffer={true}
        variant="tied"
        testID="test-badge-tied"
      />
    );

    expect(getByTextTied('🏆 Tied for Best')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { getByTestId: getByTestIdSmall } = render(
      <BestOfferBadge
        isBestOffer={true}
        size="small"
        testID="test-badge-small"
      />
    );

    expect(getByTestIdSmall('test-badge-small')).toBeTruthy();

    const { getByTestId: getByTestIdLarge } = render(
      <BestOfferBadge
        isBestOffer={true}
        size="large"
        testID="test-badge-large"
      />
    );

    expect(getByTestIdLarge('test-badge-large')).toBeTruthy();
  });

  it('renders with different positions', () => {
    const { getByTestId: getByTestIdTopLeft } = render(
      <BestOfferBadge
        isBestOffer={true}
        position="top-left"
        testID="test-badge-top-left"
      />
    );

    expect(getByTestIdTopLeft('test-badge-top-left')).toBeTruthy();

    const { getByTestId: getByTestIdInline } = render(
      <BestOfferBadge
        isBestOffer={true}
        position="inline"
        testID="test-badge-inline"
      />
    );

    expect(getByTestIdInline('test-badge-inline')).toBeTruthy();
  });
});

describe('StandaloneBestOfferBadge', () => {
  it('renders nothing when isBestOffer is false', () => {
    const { queryByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={false}
        testID="test-standalone-badge"
      />
    );

    expect(queryByText('🏆 Best Offer')).toBeNull();
  });

  it('renders basic best offer badge', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('renders tied badge when isTiedForBest is true', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        isTiedForBest={true}
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Tied for Best Offer')).toBeTruthy();
  });

  it('renders with savings amount', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        savingsAmount={5.99}
        currency="CAD"
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Best Offer • Save CAD 5.99')).toBeTruthy();
  });

  it('renders with savings percentage', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        savingsPercentage={15.5}
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Best Offer • Save 16%')).toBeTruthy();
  });

  it('renders with both savings amount and percentage', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        savingsAmount={5.99}
        savingsPercentage={15.5}
        currency="CAD"
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Best Offer • Save CAD 5.99 (16%)')).toBeTruthy();
  });

  it('formats zero savings correctly', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        savingsAmount={0}
        currency="USD"
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Best Offer • Save USD 0.00')).toBeTruthy();
  });

  it('handles NaN savings gracefully', () => {
    const { getByText } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        savingsAmount={NaN}
        currency="CAD"
        testID="test-standalone-badge"
      />
    );

    expect(getByText('🏆 Best Offer • Save CAD 0.00')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { getByTestId: getByTestIdSmall } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        size="small"
        testID="test-standalone-badge-small"
      />
    );

    expect(getByTestIdSmall('test-standalone-badge-small')).toBeTruthy();

    const { getByTestId: getByTestIdLarge } = render(
      <StandaloneBestOfferBadge
        isBestOffer={true}
        size="large"
        testID="test-standalone-badge-large"
      />
    );

    expect(getByTestIdLarge('test-standalone-badge-large')).toBeTruthy();
  });
});
