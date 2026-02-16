/**
 * Demographic Performance Tool
 *
 * Query performance by age, gender, and device segments.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery, buildDateRangeClause, formatMetrics } from '../lib/google-ads-client.js';

const DemographicSchema = z.object({
  dateRange: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'])
    .default('LAST_30_DAYS'),
  segmentBy: z
    .enum(['age', 'gender', 'device'])
    .default('device')
    .describe('Dimension to segment performance by'),
  campaignId: z
    .string()
    .optional()
    .describe('Filter by campaign ID'),
});

export async function getDemographicPerformance(args: unknown): Promise<string> {
  const input = DemographicSchema.parse(args);

  try {
    let whereClause = buildDateRangeClause(input.dateRange);
    if (input.campaignId) {
      whereClause += ` AND campaign.id = ${input.campaignId}`;
    }

    let segmentField: string;
    switch (input.segmentBy) {
      case 'age':
        segmentField = 'ad_group_criterion_age_range.type';
        break;
      case 'gender':
        segmentField = 'ad_group_criterion_gender.type';
        break;
      case 'device':
      default:
        segmentField = 'segments.device';
        break;
    }

    let query: string;

    if (input.segmentBy === 'device') {
      query = `
        SELECT
          segments.device,
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM campaign
        WHERE ${whereClause}
          AND campaign.status = 'ENABLED'
        ORDER BY metrics.cost_micros DESC
      `;
    } else {
      // For age and gender, use the gender/age views
      const resource = input.segmentBy === 'age' ? 'age_range_view' : 'gender_view';
      const criterion = input.segmentBy === 'age' ? 'ad_group_criterion.age_range_type' : 'ad_group_criterion.gender.type';

      query = `
        SELECT
          ${criterion},
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM ${resource}
        WHERE ${whereClause}
        ORDER BY metrics.cost_micros DESC
      `;
    }

    const results = await executeQuery(query);

    if (results.length === 0) {
      return `No demographic data found for ${input.dateRange}`;
    }

    const segments = results.map((row: any) => {
      let segmentValue: string;
      if (input.segmentBy === 'device') {
        segmentValue = row.segments?.device || 'UNKNOWN';
      } else if (input.segmentBy === 'age') {
        segmentValue = row.ad_group_criterion?.age_range_type || 'UNKNOWN';
      } else {
        segmentValue = row.ad_group_criterion?.gender?.type || 'UNKNOWN';
      }

      return {
        segment: segmentValue,
        campaignId: row.campaign?.id?.toString(),
        campaignName: row.campaign?.name,
        metrics: formatMetrics(row),
      };
    });

    return JSON.stringify({
      dateRange: input.dateRange,
      segmentBy: input.segmentBy,
      segmentCount: segments.length,
      segments,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying demographic performance';
  }
}

export const demographicPerformanceTool: Tool = {
  name: 'get-demographic-performance',
  description: 'Query performance segmented by age, gender, or device type with metrics like impressions, clicks, cost, and conversions',
  inputSchema: {
    type: 'object' as const,
    properties: {
      dateRange: {
        type: 'string' as const,
        enum: ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90_DAYS'],
        default: 'LAST_30_DAYS',
      },
      segmentBy: {
        type: 'string' as const,
        enum: ['age', 'gender', 'device'],
        description: 'Dimension to segment performance by',
        default: 'device',
      },
      campaignId: {
        type: 'string' as const,
        description: 'Filter by campaign ID',
      },
    },
  },
};
