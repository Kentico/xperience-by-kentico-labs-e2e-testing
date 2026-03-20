import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const DEFAULT_DANCING_GOAT_MCP_URL = 'http://localhost:44985/mcp';

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
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.DANCING_GOAT_MCP_URL ?? DEFAULT_DANCING_GOAT_MCP_URL),
  );

  const client = new Client({
    name: 'playwright-tests',
    version: '1.0.0',
  });

  await client.connect(transport);

  return client;
}