/**
 * When exam content omits ``` fences, react-markdown renders Python as plain paragraphs.
 * Insert ```python fences around contiguous code lines so highlighting works even if the LLM
 * puts prose and code in the same block with single newlines.
 */

const CODE_START =
  /^\s*(async\s+def\s|def\s|class\s|@\w+|import\s|from\s+\w+\s+import|print\(|if\s|for\s|while\s|elif\s|else:|try:|except\b|with\s|raise\s)/;

function isCodeStartLine(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  if (CODE_START.test(s)) return true;
  if (/^(print|exec|eval)\(/.test(s)) return true;
  return false;
}

/** Continuation of a code block: indented body, elif/else, closing parens, etc. */
function isLikelyCodeContinuation(prevWasCode: boolean, line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  if (!prevWasCode) return false;
  if (/^\s{2,}\S/.test(line)) return true; // indented
  if (/^(elif |else:|except|finally:)/.test(s)) return true;
  if (/^return\b/.test(s)) return true;
  if (/^(print|exec|eval)\(/.test(s)) return true;
  if (/^def\s|class\s/.test(s)) return true;
  // Expression / assign continuation
  if (/[=;]/.test(s) && /[()\[\]'"`]/.test(s)) return true;
  return false;
}

function flushCodeBlock(lines: string[]): string {
  return "```python\n" + lines.join("\n") + "\n```";
}

export function ensureFencedCode(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;
  if (trimmed.includes("```")) return content;

  const rawLines = content.split(/\n/);
  const out: string[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    if (isCodeStartLine(line)) {
      const block: string[] = [];
      let prevCode = false;
      while (i < rawLines.length) {
        const L = rawLines[i];
        if (block.length === 0) {
          block.push(L);
          prevCode = true;
          i++;
          continue;
        }
        // Blank line ends block unless next line clearly continues code
        if (!L.trim()) {
          const next = rawLines[i + 1];
          if (next && isLikelyCodeContinuation(true, next)) {
            block.push(L);
            i++;
            continue;
          }
          break;
        }
        if (isLikelyCodeContinuation(prevCode, L) || isCodeStartLine(L)) {
          block.push(L);
          i++;
          prevCode = true;
          continue;
        }
        break;
      }
      out.push(flushCodeBlock(block));
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join("\n");
}
