/**
 * ISO code validation utilities for suppliers
 * Provides comprehensive validation for country codes, region codes, and currency codes
 */

// ISO 3166-1 alpha-2 country codes (comprehensive list)
export const ISO_COUNTRY_CODES = new Set([
  'AD',
  'AE',
  'AF',
  'AG',
  'AI',
  'AL',
  'AM',
  'AO',
  'AQ',
  'AR',
  'AS',
  'AT',
  'AU',
  'AW',
  'AX',
  'AZ',
  'BA',
  'BB',
  'BD',
  'BE',
  'BF',
  'BG',
  'BH',
  'BI',
  'BJ',
  'BL',
  'BM',
  'BN',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BT',
  'BV',
  'BW',
  'BY',
  'BZ',
  'CA',
  'CC',
  'CD',
  'CF',
  'CG',
  'CH',
  'CI',
  'CK',
  'CL',
  'CM',
  'CN',
  'CO',
  'CR',
  'CU',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DE',
  'DJ',
  'DK',
  'DM',
  'DO',
  'DZ',
  'EC',
  'EE',
  'EG',
  'EH',
  'ER',
  'ES',
  'ET',
  'FI',
  'FJ',
  'FK',
  'FM',
  'FO',
  'FR',
  'GA',
  'GB',
  'GD',
  'GE',
  'GF',
  'GG',
  'GH',
  'GI',
  'GL',
  'GM',
  'GN',
  'GP',
  'GQ',
  'GR',
  'GS',
  'GT',
  'GU',
  'GW',
  'GY',
  'HK',
  'HM',
  'HN',
  'HR',
  'HT',
  'HU',
  'ID',
  'IE',
  'IL',
  'IM',
  'IN',
  'IO',
  'IQ',
  'IR',
  'IS',
  'IT',
  'JE',
  'JM',
  'JO',
  'JP',
  'KE',
  'KG',
  'KH',
  'KI',
  'KM',
  'KN',
  'KP',
  'KR',
  'KW',
  'KY',
  'KZ',
  'LA',
  'LB',
  'LC',
  'LI',
  'LK',
  'LR',
  'LS',
  'LT',
  'LU',
  'LV',
  'LY',
  'MA',
  'MC',
  'MD',
  'ME',
  'MF',
  'MG',
  'MH',
  'MK',
  'ML',
  'MM',
  'MN',
  'MO',
  'MP',
  'MQ',
  'MR',
  'MS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MX',
  'MY',
  'MZ',
  'NA',
  'NC',
  'NE',
  'NF',
  'NG',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NU',
  'NZ',
  'OM',
  'PA',
  'PE',
  'PF',
  'PG',
  'PH',
  'PK',
  'PL',
  'PM',
  'PN',
  'PR',
  'PS',
  'PT',
  'PW',
  'PY',
  'QA',
  'RE',
  'RO',
  'RS',
  'RU',
  'RW',
  'SA',
  'SB',
  'SC',
  'SD',
  'SE',
  'SG',
  'SH',
  'SI',
  'SJ',
  'SK',
  'SL',
  'SM',
  'SN',
  'SO',
  'SR',
  'SS',
  'ST',
  'SV',
  'SX',
  'SY',
  'SZ',
  'TC',
  'TD',
  'TF',
  'TG',
  'TH',
  'TJ',
  'TK',
  'TL',
  'TM',
  'TN',
  'TO',
  'TR',
  'TT',
  'TV',
  'TW',
  'TZ',
  'UA',
  'UG',
  'UM',
  'US',
  'UY',
  'UZ',
  'VA',
  'VC',
  'VE',
  'VG',
  'VI',
  'VN',
  'VU',
  'WF',
  'WS',
  'YE',
  'YT',
  'ZA',
  'ZM',
  'ZW',
]);

// ISO 4217 currency codes (comprehensive list of active currencies)
export const ISO_CURRENCY_CODES = new Set([
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BOV',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHE',
  'CHF',
  'CHW',
  'CLF',
  'CLP',
  'CNY',
  'COP',
  'COU',
  'CRC',
  'CUC',
  'CUP',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GGP',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HRK',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'IMP',
  'INR',
  'IQD',
  'IRR',
  'ISK',
  'JEP',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KPW',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MXV',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SLL',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TRY',
  'TTD',
  'TVD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'USN',
  'UYI',
  'UYU',
  'UYW',
  'UZS',
  'VED',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAG',
  'XAU',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XCD',
  'XDR',
  'XOF',
  'XPD',
  'XPF',
  'XPT',
  'XSU',
  'XTS',
  'XUA',
  'XXX',
  'YER',
  'ZAR',
  'ZMW',
  'ZWL',
]);

// Common region codes for major countries (subset for validation)
export const COMMON_REGION_CODES = new Set([
  // Canada
  'CA-AB',
  'CA-BC',
  'CA-MB',
  'CA-NB',
  'CA-NL',
  'CA-NS',
  'CA-NT',
  'CA-NU',
  'CA-ON',
  'CA-PE',
  'CA-QC',
  'CA-SK',
  'CA-YT',
  // United States (states)
  'US-AL',
  'US-AK',
  'US-AZ',
  'US-AR',
  'US-CA',
  'US-CO',
  'US-CT',
  'US-DE',
  'US-FL',
  'US-GA',
  'US-HI',
  'US-ID',
  'US-IL',
  'US-IN',
  'US-IA',
  'US-KS',
  'US-KY',
  'US-LA',
  'US-ME',
  'US-MD',
  'US-MA',
  'US-MI',
  'US-MN',
  'US-MS',
  'US-MO',
  'US-MT',
  'US-NE',
  'US-NV',
  'US-NH',
  'US-NJ',
  'US-NM',
  'US-NY',
  'US-NC',
  'US-ND',
  'US-OH',
  'US-OK',
  'US-OR',
  'US-PA',
  'US-RI',
  'US-SC',
  'US-SD',
  'US-TN',
  'US-TX',
  'US-UT',
  'US-VT',
  'US-VA',
  'US-WA',
  'US-WV',
  'US-WI',
  'US-WY',
  // United Kingdom
  'GB-ENG',
  'GB-SCT',
  'GB-WLS',
  'GB-NIR',
  // Australia
  'AU-ACT',
  'AU-NSW',
  'AU-NT',
  'AU-QLD',
  'AU-SA',
  'AU-TAS',
  'AU-VIC',
  'AU-WA',
  // Germany
  'DE-BW',
  'DE-BY',
  'DE-BE',
  'DE-BB',
  'DE-HB',
  'DE-HH',
  'DE-HE',
  'DE-MV',
  'DE-NI',
  'DE-NW',
  'DE-RP',
  'DE-SL',
  'DE-SN',
  'DE-ST',
  'DE-SH',
  'DE-TH',
]);

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validates ISO 3166-1 alpha-2 country code
 */
export function validateCountryCode(code: string): ValidationResult {
  if (!code) {
    return { isValid: false, error: 'Country code is required' };
  }

  const normalizedCode = code.trim().toUpperCase();

  if (normalizedCode.length !== 2) {
    return {
      isValid: false,
      error: 'Country code must be exactly 2 characters',
      suggestion: 'Use ISO 3166-1 alpha-2 format (e.g., CA, US, GB)',
    };
  }

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return {
      isValid: false,
      error: 'Country code must contain only uppercase letters',
      suggestion: 'Use ISO 3166-1 alpha-2 format (e.g., CA, US, GB)',
    };
  }

  if (!ISO_COUNTRY_CODES.has(normalizedCode)) {
    return {
      isValid: false,
      error: `'${normalizedCode}' is not a valid ISO 3166-1 country code`,
      suggestion: 'Check the ISO 3166-1 alpha-2 country code list',
    };
  }

  return { isValid: true };
}

/**
 * Validates ISO 3166-2 region code
 */
export function validateRegionCode(
  code: string,
  countryCode?: string
): ValidationResult {
  if (!code) {
    return { isValid: true }; // Region code is optional
  }

  const normalizedCode = code.trim().toUpperCase();

  if (!/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(normalizedCode)) {
    return {
      isValid: false,
      error: 'Region code must follow ISO 3166-2 format',
      suggestion: 'Use format like CA-NS, US-CA, GB-ENG',
    };
  }

  const [regionCountry] = normalizedCode.split('-');

  if (countryCode && regionCountry !== countryCode.toUpperCase()) {
    return {
      isValid: false,
      error: `Region code country '${regionCountry}' does not match supplier country '${countryCode}'`,
      suggestion: `Use region code starting with '${countryCode.toUpperCase()}-'`,
    };
  }

  // Check against common region codes (not exhaustive, but covers major ones)
  if (!COMMON_REGION_CODES.has(normalizedCode)) {
    return {
      isValid: true, // Allow unknown region codes but warn
      suggestion: `'${normalizedCode}' is not in our common region codes list. Please verify it's correct.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates ISO 4217 currency code
 */
export function validateCurrencyCode(code: string): ValidationResult {
  if (!code) {
    return { isValid: false, error: 'Currency code is required' };
  }

  const normalizedCode = code.trim().toUpperCase();

  if (normalizedCode.length !== 3) {
    return {
      isValid: false,
      error: 'Currency code must be exactly 3 characters',
      suggestion: 'Use ISO 4217 format (e.g., CAD, USD, EUR)',
    };
  }

  if (!/^[A-Z]{3}$/.test(normalizedCode)) {
    return {
      isValid: false,
      error: 'Currency code must contain only uppercase letters',
      suggestion: 'Use ISO 4217 format (e.g., CAD, USD, EUR)',
    };
  }

  if (!ISO_CURRENCY_CODES.has(normalizedCode)) {
    return {
      isValid: false,
      error: `'${normalizedCode}' is not a valid ISO 4217 currency code`,
      suggestion: 'Check the ISO 4217 currency code list',
    };
  }

  return { isValid: true };
}

/**
 * Validates URL patterns array
 */
export function validateUrlPatterns(patterns: string[]): ValidationResult {
  if (!patterns || patterns.length === 0) {
    return { isValid: true }; // URL patterns are optional
  }

  for (const pattern of patterns) {
    const trimmedPattern = pattern.trim();
    if (!trimmedPattern) continue;

    try {
      // Basic URL validation - must be a valid URL
      new globalThis.URL(trimmedPattern);
    } catch {
      // If not a full URL, check if it's a valid hostname pattern
      // Allow patterns like: example.com, *.example.com, shop.example.com, example.com/path
      if (
        !/^(\*\.)?[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(\/.*)?\*?$/.test(
          trimmedPattern
        )
      ) {
        return {
          isValid: false,
          error: `'${trimmedPattern}' is not a valid URL pattern`,
          suggestion:
            'Use full URLs (https://example.com) or hostname patterns (example.com, *.example.com)',
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Validates shipping policy values
 */
export function validateShippingPolicy(policy: {
  freeShippingThreshold?: number;
  shippingBaseCost?: number;
  shippingPerItemCost?: number;
  pickupAvailable?: boolean;
}): ValidationResult {
  if (!policy) {
    return { isValid: true }; // Shipping policy is optional
  }

  const { freeShippingThreshold, shippingBaseCost, shippingPerItemCost } =
    policy;

  if (freeShippingThreshold !== undefined) {
    if (
      typeof freeShippingThreshold !== 'number' ||
      freeShippingThreshold < 0
    ) {
      return {
        isValid: false,
        error: 'Free shipping threshold must be a non-negative number',
      };
    }
  }

  if (shippingBaseCost !== undefined) {
    if (typeof shippingBaseCost !== 'number' || shippingBaseCost < 0) {
      return {
        isValid: false,
        error: 'Shipping base cost must be a non-negative number',
      };
    }
  }

  if (shippingPerItemCost !== undefined) {
    if (typeof shippingPerItemCost !== 'number' || shippingPerItemCost < 0) {
      return {
        isValid: false,
        error: 'Shipping per-item cost must be a non-negative number',
      };
    }
  }

  return { isValid: true };
}

/**
 * Comprehensive supplier validation function
 */
export function validateSupplierFields(supplier: {
  name: string;
  countryCode: string;
  regionCode?: string;
  defaultCurrency: string;
  urlPatterns?: string[];
  shippingPolicy?: {
    freeShippingThreshold?: number;
    shippingBaseCost?: number;
    shippingPerItemCost?: number;
    pickupAvailable?: boolean;
  };
}): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Validate name
  if (!supplier.name?.trim()) {
    results.push({ isValid: false, error: 'Supplier name is required' });
  } else if (supplier.name.trim().length > 200) {
    results.push({
      isValid: false,
      error: 'Supplier name is too long (max 200 characters)',
    });
  }

  // Validate country code
  results.push(validateCountryCode(supplier.countryCode));

  // Validate region code
  if (supplier.regionCode) {
    results.push(validateRegionCode(supplier.regionCode, supplier.countryCode));
  }

  // Validate currency code
  results.push(validateCurrencyCode(supplier.defaultCurrency));

  // Validate URL patterns
  if (supplier.urlPatterns) {
    results.push(validateUrlPatterns(supplier.urlPatterns));
  }

  // Validate shipping policy
  if (supplier.shippingPolicy) {
    results.push(validateShippingPolicy(supplier.shippingPolicy));
  }

  return results;
}

/**
 * Get country name from country code (for display purposes)
 */
export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    CA: 'Canada',
    US: 'United States',
    GB: 'United Kingdom',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    JP: 'Japan',
    CN: 'China',
    IN: 'India',
    BR: 'Brazil',
    MX: 'Mexico',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    CH: 'Switzerland',
    AT: 'Austria',
    BE: 'Belgium',
    IE: 'Ireland',
    NZ: 'New Zealand',
    SG: 'Singapore',
    HK: 'Hong Kong',
    KR: 'South Korea',
    TW: 'Taiwan',
    TH: 'Thailand',
    MY: 'Malaysia',
    PH: 'Philippines',
    ID: 'Indonesia',
    VN: 'Vietnam',
    ZA: 'South Africa',
    EG: 'Egypt',
    NG: 'Nigeria',
    KE: 'Kenya',
    MA: 'Morocco',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    VE: 'Venezuela',
    UY: 'Uruguay',
    EC: 'Ecuador',
    BO: 'Bolivia',
    PY: 'Paraguay',
    GY: 'Guyana',
    SR: 'Suriname',
    GF: 'French Guiana',
  };

  return countryNames[countryCode.toUpperCase()] || countryCode.toUpperCase();
}

/**
 * Get currency name from currency code (for display purposes)
 */
export function getCurrencyName(currencyCode: string): string {
  const currencyNames: Record<string, string> = {
    CAD: 'Canadian Dollar',
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    AUD: 'Australian Dollar',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    PLN: 'Polish Złoty',
    CZK: 'Czech Koruna',
    HUF: 'Hungarian Forint',
    RON: 'Romanian Leu',
    BGN: 'Bulgarian Lev',
    HRK: 'Croatian Kuna',
    RUB: 'Russian Ruble',
    TRY: 'Turkish Lira',
    BRL: 'Brazilian Real',
    MXN: 'Mexican Peso',
    ARS: 'Argentine Peso',
    CLP: 'Chilean Peso',
    COP: 'Colombian Peso',
    PEN: 'Peruvian Sol',
    INR: 'Indian Rupee',
    KRW: 'South Korean Won',
    THB: 'Thai Baht',
    MYR: 'Malaysian Ringgit',
    SGD: 'Singapore Dollar',
    HKD: 'Hong Kong Dollar',
    TWD: 'Taiwan Dollar',
    PHP: 'Philippine Peso',
    IDR: 'Indonesian Rupiah',
    VND: 'Vietnamese Dong',
    ZAR: 'South African Rand',
    EGP: 'Egyptian Pound',
    NGN: 'Nigerian Naira',
    KES: 'Kenyan Shilling',
    MAD: 'Moroccan Dirham',
  };

  return (
    currencyNames[currencyCode.toUpperCase()] || currencyCode.toUpperCase()
  );
}
