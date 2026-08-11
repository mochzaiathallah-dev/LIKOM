export interface ParsedTask {
  id: string;
  url: string;
  postId: string;
  instruction: string;
  comment: string;
  status: 'pending' | 'success' | 'executing';
}

/**
 * Parses raw LIKOM list text.
 * Expects a multiline structure where instructions are in parentheses (optional)
 * and URLs are on their own lines.
 */
export function parseRawText(rawText: string): ParsedTask[] {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const tasks: ParsedTask[] = [];
  
  let currentInstruction = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex for Instagram URLs (posts, reels, IGTV)
    const igUrlRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_\-]+)/i;
    const urlMatch = line.match(igUrlRegex);

    if (urlMatch) {
      const url = urlMatch[0];
      const postId = urlMatch[1];
      
      tasks.push({
        id: `${postId}-${Date.now()}-${tasks.length}`,
        url,
        postId,
        instruction: currentInstruction.trim(),
        comment: '',
        status: 'pending',
      });

      // Reset instruction for the next task
      currentInstruction = '';
    } else {
      // Regex for text inside parentheses (e.g., "(komen emot aja)")
      const parenRegex = /\(([^)]+)\)/;
      const parenMatch = line.match(parenRegex);
      if (parenMatch) {
        currentInstruction = parenMatch[1];
      }
    }
  }

  return tasks;
}
