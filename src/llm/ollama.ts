import http from 'node:http';
import { URL } from 'node:url';

export interface OllamaDiffRequest {
  model: string;
  stepId: string;
  taskId: string;
  goal: string;
  specText?: string;
  changeHints?: string[];
  fileContexts?: { path: string; snippet: string }[];
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
    ? `\nTarget files (edit only these): ${request.changeHints.join(', ')}`
    : '';

  const specSection = specText
    ? `\n## Specification\n${specText}`
    : '';

  const contextSection = request.fileContexts?.length
    ? '\n## Relevant Files\n' +
      request.fileContexts
        .map((ctx) => `### ${ctx.path}\n\n${ctx.snippet}`)
        .join('\n\n')
    : '';

  return [
    'You are an autonomous coding agent that produces unified diffs.',
    'Respond with strict JSON on a single line:',
    '{"commit_msg":"...","diff":"..."}',
    'The diff MUST be a valid unified patch that starts with either "--- a/<file>" and "+++ b/<file>" or "diff --git a/<file> b/<file>" lines, followed by @@ hunks.',
    'The diff must apply cleanly with `git apply` from the repository root.',
    'Do not wrap the JSON in markdown fences or include extra commentary outside the JSON object.',
    'Only modify the listed target files; do not create new files or touch unrelated paths.',
    'Preserve existing sections unless instructed otherwise; append the new content under the appropriate heading.',
    '',
    `## Task`,
    `Task ID: ${request.taskId}`,
    `Step ID: ${request.stepId}`,
    `Goal: ${request.goal}${hints}`,
    specSection,
    contextSection,
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

const DEFAULT_ENDPOINT = process.env.OLLAMA_ENDPOINT ?? 'http://127.0.0.1:11434/api/generate';
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180000);
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 64000);

interface OllamaGenerateBody {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, unknown>;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

interface OllamaCallResult {
  raw: string;
  text: string;
}

const callOllama = (endpoint: string, body: OllamaGenerateBody): Promise<OllamaCallResult> => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const payload = JSON.stringify(body);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        res.setEncoding('utf8');
        let buffer = '';
        const lines: string[] = [];
        let aggregatedText = '';
        let errorBody = '';
        const isErrorStatus = Boolean(res.statusCode && res.statusCode >= 400);

        const processBuffer = (): void => {
          let newlineIndex = buffer.indexOf('\n');
          while (newlineIndex !== -1) {
            const rawLine = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (rawLine.length > 0) {
              if (isErrorStatus) {
                errorBody += rawLine;
              } else {
                lines.push(rawLine);
                try {
                  const parsedLine = JSON.parse(rawLine) as Partial<OllamaGenerateResponse>;
                  if (typeof parsedLine.response === 'string') {
                    aggregatedText += parsedLine.response;
                  }
                } catch (error) {
                  // keep raw line for inspection but continue
                }
              }
            }
            newlineIndex = buffer.indexOf('\n');
          }
        };

        res.on('data', (chunk) => {
          buffer += chunk;
          processBuffer();
        });

        res.on('end', () => {
          const tail = buffer.trim();
          if (tail.length > 0) {
            if (isErrorStatus) {
              errorBody += tail;
            } else {
              lines.push(tail);
              try {
                const parsedLine = JSON.parse(tail) as Partial<OllamaGenerateResponse>;
                if (typeof parsedLine.response === 'string') {
                  aggregatedText += parsedLine.response;
                }
              } catch (error) {
                // ignore parse failure; include raw.
              }
            }
          }

          if (isErrorStatus) {
            reject(new Error(`Ollama HTTP ${res.statusCode}: ${errorBody || 'no body'}`));
            return;
          }

          resolve({ raw: lines.join('\n'), text: aggregatedText });
        });
      },
    );

    req.on('error', (error) => reject(error));
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Ollama request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.write(payload);
    req.end();
  });
};

export const generateDiffWithOllama = async (
  request: OllamaDiffRequest,
  endpoint = DEFAULT_ENDPOINT,
): Promise<OllamaDiffResult> => {
  const prompt = buildPrompt(request);
  let stdout: string;
  let llmRawResponse = '';
  try {
    const result = await callOllama(endpoint, {
      model: request.model,
      prompt,
      stream: false,
      options: {
        num_ctx: NUM_CTX,
      },
    });
    llmRawResponse = result.raw;
    stdout = result.text;
    if (!stdout || !stdout.trim()) {
      stdout = result.raw;
    }
    stdout = stdout ?? '';
    stdout = stdout.trim();
    if (!stdout) {
      throw new Error('Ollama returned an empty response.');
    }
    (request as { __rawResponse?: string }).__rawResponse = result.raw;
  } catch (error: unknown) {
    throw new Error(`Ollama HTTP request failed: ${String(error)}`);
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
    rawResponse: llmRawResponse || stdout,
    prompt,
  };
};
