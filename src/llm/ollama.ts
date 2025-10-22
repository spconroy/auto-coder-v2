import { execa } from 'execa';

export interface OllamaDiffRequest {
  model: string;
  stepId: string;
  taskId: string;
  goal: string;
  specText?: string;
  changeHints?: string[];
}

export interface OllamaDiffResult {
  diff: string;
  commitMessage?: string;
  rawResponse: string;
  prompt: string;
}

const buildPrompt = (request: OllamaDiffRequest): string => {
  const maxSpecLength = 8000;
  const specText = request.specText
    ? request.specText.length > maxSpecLength
      ? `${request.specText.slice(0, maxSpecLength)}\n[spec truncated]`
      : request.specText
    : undefined;
  const hints = request.changeHints?.length
    ? `\nTarget files: ${request.changeHints.join(', ')}`
    : '';

  const specSection = specText
    ? `\n## Specification\n${specText}`
    : '';

  return [
    'You are an autonomous coding agent that produces unified diffs.',
    'Respond with strict JSON on a single line:',
    '{"commit_msg":"...","diff":"..."}',
    'The diff must apply cleanly with `git apply` from the repository root.',
    'Do not wrap the JSON in markdown fences.',
    '',
    `## Task`,
    `Task ID: ${request.taskId}`,
    `Step ID: ${request.stepId}`,
    `Goal: ${request.goal}${hints}`,
    specSection,
  ].join('\n');
};

const extractJson = (response: string): string => {
  const trimmed = response.trim();
  const explicitJson = /\{[\s\S]*\}/.exec(trimmed);
  if (explicitJson) {
    return explicitJson[0];
  }
  return trimmed;
};

export const generateDiffWithOllama = async (
  request: OllamaDiffRequest,
): Promise<OllamaDiffResult> => {
  const prompt = buildPrompt(request);
  let stdout: string;
  try {
    const result = await execa('ollama', ['run', request.model], {
      input: prompt,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    stdout = result.stdout;
  } catch (error: unknown) {
    const err = error as Error & { stderr?: string };
    const stderr = err.stderr ? `\n${err.stderr}` : '';
    throw new Error(`Ollama invocation failed: ${err.message}${stderr}`);
  }

  let parsed: { diff?: string; commit_msg?: string; commitMessage?: string };
  try {
    const json = extractJson(stdout);
    parsed = JSON.parse(json);
  } catch (error: unknown) {
    throw new Error(`Unable to parse Ollama response as JSON. Raw response:\n${stdout}`);
  }

  if (!parsed.diff || typeof parsed.diff !== 'string') {
    throw new Error('Ollama response missing "diff" field.');
  }

  return {
    diff: parsed.diff,
    commitMessage: parsed.commit_msg ?? parsed.commitMessage,
    rawResponse: stdout,
    prompt,
  };
};
