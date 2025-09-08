import React from 'react';
import { render } from '@testing-library/react-native';
import { ShelfLifeWarningBanner } from '../ShelfLifeWarningBanner';

describe('ShelfLifeWarningBanner', () => {
  it('should render info severity warning correctly', () => {
    const { getByText, getByTestId } = render(
      <ShelfLifeWarningBanner
        message="This is an info warning"
        severity="info"
        testID="warning-banner"
      />
    );

    expect(getByTestId('warning-banner')).toBeTruthy();
    expect(getByText('This is an info warning')).toBeTruthy();
    expect(getByText('ℹ️')).toBeTruthy();
  });

  it('should render warning severity correctly', () => {
    const { getByText } = render(
      <ShelfLifeWarningBanner message="This is a warning" severity="warning" />
    );

    expect(getByText('This is a warning')).toBeTruthy();
    expect(getByText('⚠️')).toBeTruthy();
  });

  it('should render high severity warning correctly', () => {
    const { getByText } = render(
      <ShelfLifeWarningBanner
        message="This is a high severity warning"
        severity="high"
      />
    );

    expect(getByText('This is a high severity warning')).toBeTruthy();
    expect(getByText('🚨')).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <ShelfLifeWarningBanner
        message="This should not be visible"
        severity="info"
        visible={false}
      />
    );

    expect(queryByText('This should not be visible')).toBeNull();
  });

  it('should apply custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <ShelfLifeWarningBanner
        message="Custom styled warning"
        severity="info"
        style={customStyle}
        testID="custom-warning"
      />
    );

    const banner = getByTestId('custom-warning');
    expect(banner.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });
});
