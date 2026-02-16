/**
 * Data Export Tool
 *
 * Export metrics as JSON for further analysis.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';

const DataExportSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS'),
  level: z
    .enum(['campaign', 'ad_group', 'ad', 'keyword'])
    .default('campaign')
    .describe('Level of detail for the export'),
  campaignId: z
    .string()
    .optional()
    .describe('Filter by campaign ID'),
  includeDaily: z
    .boolean()
    .default(false)
    .describe('Include daily breakdowns instead of aggregated totals'),
});

export async function exportData(args: unknown): Promise<string> {
  const input = DataExportSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);
    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }

    let selectFields: string;
    let fromResource: string;

    switch (input.level) {
      case 'ad_group':
        selectFields = `
          ad_group.id,
          ad_group.name,
          ad_group.status,
          campaign.id,
          campaign.name`;
        fromResource = 'ad_group';
        break;
      case 'ad':
        selectFields = `
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.status,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name`;
        fromResource = 'ad_group_ad';
        whereClause += ` AND ad_group_ad.status != 'REMOVED'`;
        break;
      case 'keyword':
        selectFields = `
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name`;
        fromResource = 'keyword_view';
        whereClause += ` AND ad_group_criterion.type = 'KEYWORD'`;
        break;
      case 'campaign':
      default:
        selectFields = `
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type`;
        fromResource = 'campaign';
        break;
    }

    const dateSegment = input.includeDaily ? ',\n        segments.date' : '';

    const query = `
      SELECT
        ${selectFields},
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion${dateSegment}
      FROM ${fromResource}
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No data found for ${input.dateRange} at ${input.level} level`;
    }

    const rows = results.map((row: any) => {
      const base: any = { metrics: formatMetrics(row) };

      if (input.includeDaily && row.segments?.date) {
        base.date = row.segments.date;
      }

      if (row.campaign) {
        base.campaignId = row.campaign.id?.toString();
        base.campaignName = row.campaign.name;
      }
      if (row.ad_group) {
        base.adGroupId = row.ad_group.id?.toString();
        base.adGroupName = row.ad_group.name;
      }
      if (row.ad_group_ad?.ad) {
        base.adId = row.ad_group_ad.ad.id?.toString();
        base.adName = row.ad_group_ad.ad.name;
      }
      if (row.ad_group_criterion?.keyword) {
        base.keyword = row.ad_group_criterion.keyword.text;
        base.matchType = row.ad_group_criterion.keyword.match_type;
      }

      return base;
    });

    return JSON.stringify({
      dateRange: input.dateRange,
      level: input.level,
      includeDaily: input.includeDaily,
      rowCount: rows.length,
      data: rows,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error exporting data';
  }
}

export const dataExportTool: Tool = {
  name: 'export-data',
  description: 'Export Google Ads metrics as JSON at campaign, ad group, ad, or keyword level with optional daily breakdowns',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dateRange: {
        type: 'string' as const,
        enum: ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'],
        default: 'LAST_30_DAYS',
      },
      level: {
        type: 'string' as const,
        enum: ['campaign', 'ad_group', 'ad', 'keyword'],
        description: 'Level of detail for the export',
        default: 'campaign',
      },
      campaignId: {
        type: 'string' as const,
        description: 'Filter by campaign ID',
      },
      includeDaily: {
        type: 'boolean' as const,
        description: 'Include daily breakdowns instead of aggregated totals',
        default: false,
      },
    },
  },
};
