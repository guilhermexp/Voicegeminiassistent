import { describe, it, expect } from 'vitest';
import { 
  extractVideoId, 
  formatVideoUrl, 
  isValidYouTubeUrl 
} from '../youtube-utils';

describe('YouTube Utils', () => {
  describe('extractVideoId', () => {
    it('should extract video ID from standard YouTube URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short YouTube URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('http://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embedded URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should handle URLs with additional parameters', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URLs', () => {
      expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
      expect(extractVideoId('not a url')).toBeNull();
      expect(extractVideoId('')).toBeNull();
    });
  });

  describe('formatVideoUrl', () => {
    it('should format video ID to embed URL', () => {
      expect(formatVideoUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('should handle empty video ID', () => {
      expect(formatVideoUrl('')).toBe('https://www.youtube.com/embed/');
    });
  });

  describe('isValidYouTubeUrl', () => {
    it('should validate correct YouTube URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
      expect(isValidYouTubeUrl('not a url')).toBe(false);
      expect(isValidYouTubeUrl('')).toBe(false);
    });
  });
});