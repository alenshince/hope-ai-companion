import { searchWeb } from '../search.js';
import { fetchWebPage } from './fetcher.js';
import { calculate } from './calculator.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'web_search',
    description: 'Search the web for up-to-date facts, news, documentation, or verified references. Always cite returning sources.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'url_fetch',
    description: 'Fetch and extract clean text content from a specific public web URL to inspect articles or documentation deeply.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The HTTP/HTTPS URL of the web page to read'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'calculator',
    description: 'Safely execute mathematical calculations, formulas, or conversions without rounding errors.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "(12 * 45) / sqrt(16)")'
        }
      },
      required: ['expression']
    }
  }
];

export async function executeTool(name, args = {}) {
  switch (name) {
    case 'web_search': {
      const query = args.query;
      if (!query) throw new Error('Search query is required');
      const results = await searchWeb(query, 5);
      return {
        query,
        count: results.length,
        results: results.map((r, i) => ({
          id: i + 1,
          title: r.title,
          url: r.url,
          domain: r.domain,
          snippet: r.snippet
        }))
      };
    }
    case 'url_fetch': {
      const url = args.url;
      if (!url) throw new Error('URL is required');
      const page = await fetchWebPage(url, { maxChars: 3000 });
      return {
        url: page.url,
        title: page.title,
        contentExcerpt: page.content
      };
    }
    case 'calculator': {
      const expression = args.expression;
      if (!expression) throw new Error('Mathematical expression is required');
      const result = calculate(expression);
      return {
        expression,
        result
      };
    }
    default:
      throw new Error(`Unknown tool requested: ${name}`);
  }
}

