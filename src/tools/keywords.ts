/**
 * Keywords Tool
 *
 * Query keyword performance metrics from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';

const KeywordsSchema = z.object({
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
  status: z
    .enum(['ENABLED', 'PAUSED', 'ALL'])
    .default('ENABLED'),
});

export async function getKeywordPerformance(args: unknown): Promise<string> {
  const input = KeywordsSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);
    whereClause += ` AND ad_group_criterion.type = 'KEYWORD'`;

    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }
    if (input.adGroupId) {
      whereClause += ` AND ad_group.id = ${input.adGroupId}`;
    }
    if (input.status !== 'ALL') {
      whereClause += ` AND ad_group_criterion.status = '${input.status}'`;
    }

    const query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
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
      FROM keyword_view
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No keywords found for ${input.dateRange}`;
    }

    const keywords = results.map((row: any) => ({
      id: row.ad_group_criterion?.criterion_id?.toString(),
      keyword: row.ad_group_criterion?.keyword?.text,
      matchType: row.ad_group_criterion?.keyword?.match_type,
      status: row.ad_group_criterion?.status,
      qualityScore: row.ad_group_criterion?.quality_info?.quality_score,
      adGroupId: row.ad_group?.id?.toString(),
      adGroupName: row.ad_group?.name,
      campaignId: row.campaign?.id?.toString(),
      campaignName: row.campaign?.name,
      metrics: formatMetrics(row),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      keywordCount: keywords.length,
      keywords,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying keyword performance';
  }
}

export const keywordsTool: Tool = {
  name: 'get-keyword-performance',
  description: 'Query keyword performance metrics including impressions, clicks, cost, CTR, CPC, quality score, and conversions',
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
      status: {
        type: 'string' as const,
        enum: ['ENABLED', 'PAUSED', 'ALL'],
        default: 'ENABLED',
      },
    },
  },
};
