/**
 * Search Terms Tool
 *
 * Query search term report from Google Ads.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';

const SearchTermsSchema = z.object({
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
  limit: z
    .number()
    .min(1)
    .max(1000)
    .default(100)
    .describe('Maximum number of search terms to return'),
});

export async function getSearchTerms(args: unknown): Promise<string> {
  const input = SearchTermsSchema.parse(args);

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
        search_term_view.search_term,
        search_term_view.status,
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM search_term_view
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
      LIMIT ${input.limit}
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No search terms found for ${input.dateRange}`;
    }

    const searchTerms = results.map((row: any) => ({
      searchTerm: row.search_term_view?.search_term,
      status: row.search_term_view?.status,
      campaignId: row.campaign?.id?.toString(),
      campaignName: row.campaign?.name,
      adGroupId: row.ad_group?.id?.toString(),
      adGroupName: row.ad_group?.name,
      metrics: formatMetrics(row),
    }));

    return JSON.stringify({
      dateRange: input.dateRange,
      searchTermCount: searchTerms.length,
      searchTerms,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying search terms';
  }
}

export const searchTermsTool: Tool = {
  name: 'get-search-terms',
  description: 'Query the search term report showing actual search queries that triggered ads, with performance metrics',
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
      limit: {
        type: 'number' as const,
        description: 'Maximum number of search terms to return (default: 100, max: 1000)',
        default: 100,
      },
    },
  },
};
