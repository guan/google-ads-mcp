/**
 * Budget Analysis Tool
 *
 * Query budget pacing and allocation across campaigns.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, microsToDollars } from '../lib/google-ads-client.js';
import { parseEnum, CAMPAIGN_STATUS, CAMPAIGN_TYPE } from '../lib/parsers.js';

const BudgetSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS'),
  status: z
    .enum(['ENABLED', 'PAUSED', 'ALL'])
    .default('ENABLED'),
});

export async function getBudgetAnalysis(args: unknown): Promise<string> {
  const input = BudgetSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);
    if (input.status !== 'ALL') {
      whereClause += ` AND campaign.status = '${input.status}'`;
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        campaign_budget.total_amount_micros,
        campaign_budget.delivery_method,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM campaign
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No campaigns found for ${input.dateRange}`;
    }

    let totalSpend = 0;
    let totalBudget = 0;

    const campaigns = results.map((row: any) => {
      const dailyBudget = row.campaign_budget?.amount_micros
        ? microsToDollars(row.campaign_budget.amount_micros)
        : 0;
      const spend = row.metrics?.cost_micros
        ? microsToDollars(row.metrics.cost_micros)
        : 0;

      totalSpend += spend;
      totalBudget += dailyBudget;

      return {
        id: row.campaign?.id?.toString(),
        name: row.campaign?.name,
        status: parseEnum(row.campaign?.status, CAMPAIGN_STATUS),
        type: parseEnum(row.campaign?.advertising_channel_type, CAMPAIGN_TYPE),
        dailyBudget,
        spend,
        budgetUtilization: dailyBudget > 0
          ? parseFloat(((spend / dailyBudget) * 100).toFixed(1))
          : 0,
        deliveryMethod: row.campaign_budget?.delivery_method,
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        conversions: parseFloat(Number(row.metrics?.conversions || 0).toFixed(2)),
        costPerConversion: row.metrics?.cost_per_conversion
          ? microsToDollars(row.metrics.cost_per_conversion)
          : null,
      };
    });

    return JSON.stringify({
      dateRange: input.dateRange,
      summary: {
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalDailyBudget: parseFloat(totalBudget.toFixed(2)),
        campaignCount: campaigns.length,
      },
      campaigns,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying budget analysis';
  }
}

export const budgetAnalysisTool: Tool = {
  name: 'get-budget-analysis',
  description: 'Analyze budget pacing and allocation across campaigns, showing daily budgets, actual spend, and utilization rates',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dateRange: {
        type: 'string' as const,
        enum: ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'],
        default: 'LAST_30_DAYS',
      },
      status: {
        type: 'string' as const,
        enum: ['ENABLED', 'PAUSED', 'ALL'],
        default: 'ENABLED',
      },
    },
  },
};
