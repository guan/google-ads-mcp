/**
 * Conversions Tool
 *
 * Query conversion action definitions and metrics from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, microsToDollars } from '../lib/google-ads-client.js';

const ConversionsSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS'),
  campaignId: z
    .string()
    .optional()
    .describe('Filter by campaign ID'),
});

export async function getConversions(args: unknown): Promise<string> {
  const input = ConversionsSchema.parse(args);

  try {
    // First, get conversion action definitions
    const actionsQuery = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
      ORDER BY conversion_action.name
    `;

    const actions = await executeQuery(actionsQuery);

    // Then, get conversion metrics by campaign
    let whereClause = buildDateRangeClause(input.dateRange);
    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }

    const metricsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        segments.conversion_action_name,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.all_conversions_value
      FROM campaign
      WHERE ${whereClause}
        AND metrics.conversions > 0
      ORDER BY metrics.conversions DESC
    `;

    const metrics = await executeQuery(metricsQuery);

    const conversionActions = actions.map((row: any) => ({
      id: row.conversion_action?.id?.toString(),
      name: row.conversion_action?.name,
      category: row.conversion_action?.category,
      type: row.conversion_action?.type,
      status: row.conversion_action?.status,
    }));

    const conversionMetrics = metrics.map((row: any) => ({
      campaignId: row.campaign?.id?.toString(),
      campaignName: row.campaign?.name,
      conversionAction: row.segments?.conversion_action_name,
      conversions: parseFloat(Number(row.metrics?.conversions || 0).toFixed(2)),
      conversionsValue: parseFloat(Number(row.metrics?.conversions_value || 0).toFixed(2)),
      allConversions: parseFloat(Number(row.metrics?.all_conversions || 0).toFixed(2)),
      allConversionsValue: parseFloat(Number(row.metrics?.all_conversions_value || 0).toFixed(2)),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      conversionActions,
      conversionMetrics,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying conversions';
  }
}

export const conversionsTool: Tool = {
  name: 'get-conversions',
  description: 'Query conversion action definitions and conversion metrics by campaign, including conversion values and all-conversions',
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
    },
  },
};
