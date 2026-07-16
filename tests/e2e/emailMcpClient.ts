import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { mcpBaseUrl } from '../support/config';

/**
 * Creates a connected MCP client for the Dancing Goat email server.
 *
 * Example:
 * const email = await createEmailClient();
 *
 * const message = await email.callTool({
 *   name: 'wait_for_email',
 *   arguments: {
 *     inbox: 'user@test.com',
 *     subjectContains: 'Confirm your account',
 *     timeoutMs: 30000,
 *   },
 * });
 *
 * @returns A connected MCP client instance.
 */
export async function createEmailClient() {
  const transport = new StreamableHTTPClientTransport(new URL(mcpBaseUrl));

  const client = new Client({
    name: 'playwright-tests',
    version: '1.0.0',
  });

  await client.connect(transport);

  return client;
}