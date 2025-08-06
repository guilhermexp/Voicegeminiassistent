/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScrapeResult {
  success: boolean;
  data?: {
    markdown: string;
    metadata: {
      title: string;
      sourceURL: string;
    };
  };
  error?: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const firecrawlApiKey = (process.env as any).FIRECRAWL_API_KEY || '';

  if (!firecrawlApiKey) {
    console.error('Firecrawl API key is not set in environment variables.');
    return {
      success: false,
      error:
        'A chave da API do Firecrawl não está configurada no ambiente. A funcionalidade de análise de URL está desativada.',
    };
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url: url,
        pageOptions: {
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Falha na chamada da API do Firecrawl: ${
          errorData.error || response.statusText
        }`,
      );
    }

    const result = await response.json();
    if (result.success && result.data && result.data.markdown) {
      return result;
    } else {
      throw new Error(
        result.error ||
          'A API do Firecrawl retornou uma resposta malsucedida ou sem dados de markdown.',
      );
    }
  } catch (e) {
    console.error('Erro ao fazer scrap da URL:', e);
    return {success: false, error: (e as Error).message};
  }
}
