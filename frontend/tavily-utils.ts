/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  response_time: number;
}

export interface TavilySearchOptions {
  search_depth?: 'basic' | 'advanced';
  topic?: 'general' | 'news';
  max_results?: number;
  include_answer?: boolean | 'basic' | 'advanced';
  include_raw_content?: boolean;
  include_images?: boolean;
  include_domains?: string[];
  exclude_domains?: string[];
  time_range?: string;
}

export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse> {
  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY;

  if (!tavilyApiKey) {
    console.error('Tavily API key is not set.');
    throw new Error('A chave da API do Tavily não está configurada.');
  }

  const defaultOptions: TavilySearchOptions = {
    search_depth: 'basic',
    topic: 'general',
    max_results: 5,
    include_answer: 'basic',
    ...options
  };

  try {
    const response = await fetch(`${(import.meta as any).env?.REACT_APP_BACKEND_URL || ''}/api/search/tavily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`,
      },
      body: JSON.stringify({
        query,
        ...defaultOptions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Falha na chamada da API do Tavily: ${
          errorData.error || response.statusText
        }`
      );
    }

    const result = await response.json();
    return result;
  } catch (e) {
    console.error('Erro ao fazer busca no Tavily:', e);
    throw e;
  }
}

export function formatSearchResultsForAssistant(
  searchResponse: TavilySearchResponse
): string {
  let formatted = `Resultados da pesquisa para "${searchResponse.query}":\n\n`;

  if (searchResponse.answer) {
    formatted += `**Resumo:** ${searchResponse.answer}\n\n`;
  }

  formatted += '**Fontes encontradas:**\n';
  searchResponse.results.forEach((result, index) => {
    formatted += `\n${index + 1}. **${result.title}**\n`;
    formatted += `   URL: ${result.url}\n`;
    formatted += `   ${result.content}\n`;
  });

  return formatted;
}