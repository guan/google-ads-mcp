/**
 * Ad Groups Tool
 *
 * Query ad group performance metrics from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';
import { parseEnum, AD_GROUP_STATUS, AD_GROUP_TYPE } from '../lib/parsers.js';

const AdGroupsSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS'),
  campaignId: z
    .string()
    .optional()
    .describe('Filter by campaign ID'),
  status: z
    .enum(['ENABLED', 'PAUSED', 'ALL'])
    .default('ENABLED'),
});

export async function getAdGroupPerformance(args: unknown): Promise<string> {
  const input = AdGroupsSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);

    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }
    if (input.status !== 'ALL') {
      whereClause += ` AND ad_group.status = '${input.status}'`;
    }

    const query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.type,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM ad_group
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No ad groups found for ${input.dateRange}`;
    }

    const adGroups = results.map((row: any) => ({
      id: row.ad_group.id?.toString(),
      name: row.ad_group.name,
      status: parseEnum(row.ad_group.status, AD_GROUP_STATUS),
      type: parseEnum(row.ad_group.type, AD_GROUP_TYPE),
      campaignId: row.campaign.id?.toString(),
      campaignName: row.campaign.name,
      metrics: formatMetrics(row),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      adGroupCount: adGroups.length,
      adGroups,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying ad group performance';
  }
}

export const adGroupsTool: Tool = {
  name: 'get-ad-group-performance',
  description: 'Query ad group performance metrics including impressions, clicks, cost, CTR, CPC, and conversions',
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
      status: {
        type: 'string' as const,
        enum: ['ENABLED', 'PAUSED', 'ALL'],
        default: 'ENABLED',
      },
    },
  },
};
