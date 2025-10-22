export interface FsApplyPatchResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  changedFiles?: string[];
  errorMessage?: string;
}

export interface McpClient {
  fsApplyPatch(diff: string): Promise<FsApplyPatchResult>;
}
