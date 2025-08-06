import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeUrl } from '../firecrawl-utils';

// Mock fetch globally
global.fetch = vi.fn();

describe('Firecrawl Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    process.env.FIRECRAWL_API_KEY = 'test-api-key';
  });

  describe('scrapeUrl', () => {
    it('should successfully scrape a URL', async () => {
      const mockResponse = {
        success: true,
        data: {
          markdown: '# Test Content',
          metadata: {
            title: 'Test Page',
            sourceURL: 'https://example.com'
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await scrapeUrl('https://example.com');
      
      expect(result.success).toBe(true);
      expect(result.data?.markdown).toBe('# Test Content');
      expect(result.data?.metadata.title).toBe('Test Page');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid URL' })
      });

      const result = await scrapeUrl('invalid-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Falha na chamada da API do Firecrawl');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await scrapeUrl('https://example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle missing API key', async () => {
      // Temporarily remove API key
      const originalKey = process.env.FIRECRAWL_API_KEY;
      delete process.env.FIRECRAWL_API_KEY;

      const result = await scrapeUrl('https://example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('A chave da API do Firecrawl não está configurada');

      // Restore API key
      process.env.FIRECRAWL_API_KEY = originalKey;
    });

    it('should make correct API call with headers', async () => {
      const mockResponse = {
        success: true,
        data: { markdown: 'content', metadata: { title: 'Test', sourceURL: 'url' } }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await scrapeUrl('https://example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v1/scrape',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key'
          })
        })
      );
    });
  });
});