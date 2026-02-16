/**
 * Asset Groups Tool
 *
 * Query Performance Max asset group performance from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';

const AssetGroupsSchema = z.object({
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

export async function getAssetGroupPerformance(args: unknown): Promise<string> {
  const input = AssetGroupsSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);

    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }
    if (input.status !== 'ALL') {
      whereClause += ` AND asset_group.status = '${input.status}'`;
    }

    const query = `
      SELECT
        asset_group.id,
        asset_group.name,
        asset_group.status,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion
      FROM asset_group
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No asset groups found for ${input.dateRange}`;
    }

    const assetGroups = results.map((row: any) => ({
      id: row.asset_group?.id?.toString(),
      name: row.asset_group?.name,
      status: row.asset_group?.status,
      campaignId: row.campaign?.id?.toString(),
      campaignName: row.campaign?.name,
      metrics: formatMetrics(row),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      assetGroupCount: assetGroups.length,
      assetGroups,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying asset group performance';
  }
}

export const assetGroupsTool: Tool = {
  name: 'get-asset-group-performance',
  description: 'Query Performance Max asset group performance metrics including impressions, clicks, cost, CTR, and conversions',
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
