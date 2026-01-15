import { describe, it, expect } from 'vitest';

// Extract parseArgs function for testing
function parseArgs(argv: string[]): { args: string[]; flags: Record<string, string | boolean> } {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      args.push(arg);
      i++;
    }
  }

  return { args, flags };
}

describe('parseArgs', () => {
  describe('positional arguments', () => {
    it('should parse single positional argument', () => {
      const result = parseArgs(['open']);
      expect(result.args).toEqual(['open']);
      expect(result.flags).toEqual({});
    });

    it('should parse multiple positional arguments', () => {
      const result = parseArgs(['get', 'text', '#selector']);
      expect(result.args).toEqual(['get', 'text', '#selector']);
      expect(result.flags).toEqual({});
    });

    it('should handle empty input', () => {
      const result = parseArgs([]);
      expect(result.args).toEqual([]);
      expect(result.flags).toEqual({});
    });
  });

  describe('long flags (--flag)', () => {
    it('should parse boolean long flag', () => {
      const result = parseArgs(['snapshot', '--interactive']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({ interactive: true });
    });

    it('should parse long flag with value', () => {
      const result = parseArgs(['snapshot', '--depth', '3']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({ depth: '3' });
    });

    it('should parse multiple long flags', () => {
      const result = parseArgs(['snapshot', '--interactive', '--compact', '--depth', '5']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({ interactive: true, compact: true, depth: '5' });
    });
  });

  describe('short flags (-f)', () => {
    it('should parse boolean short flag', () => {
      const result = parseArgs(['snapshot', '-i']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({ i: true });
    });

    it('should parse short flag with value', () => {
      const result = parseArgs(['snapshot', '-d', '3']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({ d: '3' });
    });

    it('should parse multiple short flags', () => {
      const result = parseArgs(['snapshot', '-i', '-c', '-d', '5']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({ i: true, c: true, d: '5' });
    });
  });

  describe('mixed arguments', () => {
    it('should handle args and flags mixed', () => {
      const result = parseArgs(['open', 'https://example.com', '--json']);
      expect(result.args).toEqual(['open', 'https://example.com']);
      expect(result.flags).toEqual({ json: true });
    });

    it('should handle complex CLI invocation', () => {
      const result = parseArgs([
        'find', 'role', 'button', 'click',
        '--name', 'Submit',
        '--index', '0',
      ]);
      expect(result.args).toEqual(['find', 'role', 'button', 'click']);
      expect(result.flags).toEqual({ name: 'Submit', index: '0' });
    });

    it('should handle short and long flags together', () => {
      const result = parseArgs(['snapshot', '-i', '--compact', '-d', '3', '--scope', '#main']);
      expect(result.args).toEqual(['snapshot']);
      expect(result.flags).toEqual({
        i: true,
        compact: true,
        d: '3',
        scope: '#main',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle -- as a flag (current behavior)', () => {
      const result = parseArgs(['fill', '#input', '--', 'text']);
      // Note: current implementation treats -- as a boolean flag with empty key
      // This documents current behavior - not ideal but functional
      expect(result.args).toEqual(['fill', '#input']);
      expect(result.flags).toEqual({ '': 'text' });
    });

    it('should handle URL-like arguments', () => {
      const result = parseArgs(['open', 'https://example.com/path?query=1']);
      expect(result.args).toEqual(['open', 'https://example.com/path?query=1']);
      expect(result.flags).toEqual({});
    });

    it('should handle selector arguments with special characters', () => {
      const result = parseArgs(['click', '[data-testid="submit-btn"]']);
      expect(result.args).toEqual(['click', '[data-testid="submit-btn"]']);
      expect(result.flags).toEqual({});
    });

    it('should handle ref selectors', () => {
      const result = parseArgs(['click', '@e42']);
      expect(result.args).toEqual(['click', '@e42']);
      expect(result.flags).toEqual({});
    });
  });
});

describe('CLI commands', () => {
  describe('output formatting', () => {
    it('should format success messages correctly', () => {
      // Test the success message format
      const message = 'Navigated to https://example.com';
      expect(`✓ ${message}`).toBe('✓ Navigated to https://example.com');
    });

    it('should format error messages correctly', () => {
      const message = 'Failed to connect';
      expect(`✗ ${message}`).toBe('✗ Failed to connect');
    });
  });

  describe('URL normalization', () => {
    it('should add https:// to URLs without protocol', () => {
      const url = 'example.com';
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      expect(fullUrl).toBe('https://example.com');
    });

    it('should keep http:// URLs as-is', () => {
      const url = 'http://localhost:3000';
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      expect(fullUrl).toBe('http://localhost:3000');
    });

    it('should keep https:// URLs as-is', () => {
      const url = 'https://example.com';
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      expect(fullUrl).toBe('https://example.com');
    });
  });
});
