/**
 * Accounts Tool
 *
 * List accessible Google Ads customer accounts.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeQuery } from '../lib/google-ads-client.js';

const AccountsSchema = z.object({});

export async function getAccounts(): Promise<string> {
  try {
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.status
      FROM customer
      LIMIT 1
    `;

    const results = await executeQuery(query);

    if (results.length === 0) {
      return 'No accounts found.';
    }

    const account = results[0];
    const c = account.customer;

    return JSON.stringify({
      id: c.id?.toString(),
      name: c.descriptive_name,
      currency: c.currency_code,
      timeZone: c.time_zone,
      status: c.status,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) return `Error: ${error.message}`;
    return 'Unknown error querying accounts';
  }
}

export const accountsTool: Tool = {
  name: 'get-account',
  description: 'Get information about the Google Ads account including name, ID, currency, and status',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};
