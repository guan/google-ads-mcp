/**
 * Campaigns Tool
 *
 * Query campaign performance metrics from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';
import { parseEnum, CAMPAIGN_STATUS, CAMPAIGN_TYPE, BIDDING_STRATEGY_TYPE } from '../lib/parsers.js';

const CampaignsSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS')
    .describe('Date range for metrics query'),
  campaignId: z
    .string()
    .optional()
    .describe('Optional campaign ID to filter results'),
  status: z
    .enum(['ENABLED', 'PAUSED', 'ALL'])
    .default('ENABLED')
    .describe('Filter by campaign status'),
});

export async function getCampaignPerformance(args: unknown): Promise<string> {
  const input = CampaignsSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);

    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }

    if (input.status !== 'ALL') {
      whereClause += ` AND campaign.status = '${input.status}'`;
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion
      FROM campaign
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No campaigns found for ${input.dateRange}`;
    }

    const campaigns = results.map((row: any) => ({
      id: row.campaign.id?.toString(),
      name: row.campaign.name,
      status: parseEnum(row.campaign.status, CAMPAIGN_STATUS),
      type: parseEnum(row.campaign.advertising_channel_type, CAMPAIGN_TYPE),
      biddingStrategy: parseEnum(row.campaign.bidding_strategy_type, BIDDING_STRATEGY_TYPE),
      dailyBudget: row.campaign_budget?.amount_micros
        ? parseFloat((Number(row.campaign_budget.amount_micros) / 1_000_000).toFixed(2))
        : null,
      metrics: formatMetrics(row),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      campaignCount: campaigns.length,
      campaigns,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying campaign performance';
  }
}

export const campaignsTool: Tool = {
  name: 'get-campaign-performance',
  description: 'Query campaign performance metrics including impressions, clicks, cost, CTR, CPC, and conversions for a specified date range',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dateRange: {
        type: 'string' as const,
        enum: ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'],
        description: 'Date range for metrics query',
        default: 'LAST_30_DAYS',
      },
      campaignId: {
        type: 'string' as const,
        description: 'Optional campaign ID to filter results',
      },
      status: {
        type: 'string' as const,
        enum: ['ENABLED', 'PAUSED', 'ALL'],
        description: 'Filter by campaign status',
        default: 'ENABLED',
      },
    },
  },
};
