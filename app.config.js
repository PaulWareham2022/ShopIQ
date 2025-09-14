// Dynamic Expo config to ensure distinct iOS bundle identifiers per build profile
// Uses APP_VARIANT (preferred) or EAS_BUILD_PROFILE to switch values

const base = require('./app.json');

function getVariant() {
  if (process.env.APP_VARIANT) return process.env.APP_VARIANT;
  if (process.env.EAS_BUILD_PROFILE) return process.env.EAS_BUILD_PROFILE;
  return 'development';
}

function isProduction(variant) {
  return variant === 'production';
}

module.exports = () => {
  const variant = getVariant();
  const prod = isProduction(variant);

  const bundleIdentifier = prod ? 'com.shopiq.app' : 'com.shopiq.app.dev';
  const appName = prod ? 'ShopIQ' : 'ShopIQ Dev';

  const expo = base.expo || {};

  return {
    ...expo,
    name: appName,
    ios: {
      ...(expo.ios || {}),
      bundleIdentifier,
    },
    android: {
      ...(expo.android || {}),
    },
    extra: {
      ...(expo.extra || {}),
      appVariant: variant,
    },
  };
};
