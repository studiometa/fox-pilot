/**
 * CLI Output Helpers
 */

let outputJson = false;

export function setOutputJson(value: boolean): void {
  outputJson = value;
}

export function isOutputJson(): boolean {
  return outputJson;
}

export function output(data: unknown): void {
  if (outputJson) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else if (data && typeof data === 'object') {
    if ('text' in data && typeof data.text === 'string') {
      console.log(data.text);
    } else if ('tree' in data) {
      const d = data as { text?: string; tree: unknown };
      console.log(d.text || JSON.stringify(d.tree, null, 2));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function success(message: string): void {
  if (!outputJson) {
    console.log(`✓ ${message}`);
  }
}

export function error(message: string, code = 1): never {
  if (outputJson) {
    console.log(JSON.stringify({ error: message }));
  } else {
    console.error(`✗ ${message}`);
  }
  process.exit(code);
}
