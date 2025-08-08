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
  const firecrawlApiKey = import.meta.env.VITE_FIRECRAWL_API_KEY || '';// unused on FE now

  if (!firecrawlApiKey) {
    console.error('Firecrawl API key is not set.');
    return {
      success: false,
      error: 'A chave da API do Firecrawl não está configurada.',
    };
  }

  try {
    const base = (import.meta as any).env?.REACT_APP_BACKEND_URL || '';
  const url = base.endsWith('/api') ? `${base}/scrape` : `${base}/api/scrape`;
  const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
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
    if (result.success && result.data) {
      return result;
    } else {
      throw new Error(
        result.error ||
          'A API do Firecrawl retornou uma resposta malsucedida ou sem dados.',
      );
    }
  } catch (e) {
    console.error('Erro ao fazer scrap da URL:', e);
    return {success: false, error: (e as Error).message};
  }
}
