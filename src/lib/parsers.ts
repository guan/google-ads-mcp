/**
 * Google Ads Response Parsers
 *
 * Utilities for parsing GAQL query results, handling enums,
 * and converting Google Ads API response structures.
 */

/**
 * Campaign status enum mapping
 */
export const CAMPAIGN_STATUS: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'UNKNOWN',
  2: 'ENABLED',
  3: 'PAUSED',
  4: 'REMOVED',
};

/**
 * Ad group status enum mapping
 */
export const AD_GROUP_STATUS: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'UNKNOWN',
  2: 'ENABLED',
  3: 'PAUSED',
  4: 'REMOVED',
};

/**
 * Campaign type enum mapping
 */
export const CAMPAIGN_TYPE: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'UNKNOWN',
  2: 'SEARCH',
  3: 'DISPLAY',
  4: 'SHOPPING',
  5: 'HOTEL',
  6: 'VIDEO',
  7: 'MULTI_CHANNEL',
  8: 'LOCAL',
  9: 'SMART',
  10: 'PERFORMANCE_MAX',
  11: 'LOCAL_SERVICES',
  12: 'DISCOVERY',
  13: 'TRAVEL',
  14: 'DEMAND_GEN',
};

/**
 * Ad group type enum mapping
 */
export const AD_GROUP_TYPE: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'UNKNOWN',
  2: 'SEARCH_STANDARD',
  3: 'DISPLAY_STANDARD',
  4: 'SHOPPING_PRODUCT_ADS',
  5: 'HOTEL_ADS',
  6: 'SHOPPING_SMART_ADS',
  7: 'VIDEO_BUMPER',
  8: 'VIDEO_TRUE_VIEW_IN_STREAM',
  9: 'VIDEO_TRUE_VIEW_IN_DISPLAY',
  10: 'VIDEO_NON_SKIPPABLE_IN_STREAM',
  11: 'VIDEO_OUTSTREAM',
  12: 'SEARCH_DYNAMIC_ADS',
  13: 'SHOPPING_COMPARISON_LISTING_ADS',
  14: 'PROMOTED_HOTEL_ADS',
  15: 'VIDEO_RESPONSIVE',
  16: 'VIDEO_EFFICIENT_REACH',
  17: 'SMART_CAMPAIGN_AD_GROUP',
  18: 'TRAVEL_ADS',
};

/**
 * Bidding strategy type enum mapping
 */
export const BIDDING_STRATEGY_TYPE: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'UNKNOWN',
  3: 'MANUAL_CPC',
  4: 'MANUAL_CPM',
  5: 'MANUAL_CPV',
  6: 'MAXIMIZE_CONVERSIONS',
  7: 'MAXIMIZE_CONVERSION_VALUE',
  8: 'TARGET_CPA',
  9: 'TARGET_IMPRESSION_SHARE',
  10: 'TARGET_ROAS',
  11: 'TARGET_SPEND',
  13: 'COMMISSION',
};

/**
 * Parse enum value to human-readable string
 */
export function parseEnum(value: number, enumMap: Record<number, string>): string {
  return enumMap[value] || `UNKNOWN (${value})`;
}

/**
 * Safely extract a nested value from a GAQL result row
 */
export function safeGet(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Format a number with commas for readability
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage value
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
