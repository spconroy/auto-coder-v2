import { LocalMcpClient } from './local.js';
import { McpClient } from './types.js';

export const createMcpClient = (): McpClient => {
  return new LocalMcpClient();
};

export * from './types.js';
