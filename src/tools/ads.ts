/**
 * Ads Tool
 *
 * Query ad-level performance metrics from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';

const AdsSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS'),
  campaignId: z
    .string()
    .optional()
    .describe('Filter by campaign ID'),
  adGroupId: z
    .string()
    .optional()
    .describe('Filter by ad group ID'),
});

export async function getAdPerformance(args: unknown): Promise<string> {
  const input = AdsSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);

    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }
    if (input.adGroupId) {
      whereClause += ` AND ad_group.id = ${input.adGroupId}`;
    }

    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM ad_group_ad
      WHERE ${whereClause}
        AND ad_group_ad.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No ads found for ${input.dateRange}`;
    }

    const ads = results.map((row: any) => ({
      id: row.ad_group_ad?.ad?.id?.toString(),
      name: row.ad_group_ad?.ad?.name || 'N/A',
      type: row.ad_group_ad?.ad?.type,
      status: row.ad_group_ad?.status,
      adGroupId: row.ad_group?.id?.toString(),
      adGroupName: row.ad_group?.name,
      campaignId: row.campaign?.id?.toString(),
      campaignName: row.campaign?.name,
      metrics: formatMetrics(row),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      adCount: ads.length,
      ads,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying ad performance';
  }
}

export const adsTool: Tool = {
  name: 'get-ad-performance',
  description: 'Query individual ad performance metrics including impressions, clicks, cost, CTR, CPC, and conversions',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dateRange: {
        type: 'string' as const,
        enum: ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'],
        default: 'LAST_30_DAYS',
      },
      campaignId: {
        type: 'string' as const,
        description: 'Filter by campaign ID',
      },
      adGroupId: {
        type: 'string' as const,
        description: 'Filter by ad group ID',
      },
    },
  },
};
