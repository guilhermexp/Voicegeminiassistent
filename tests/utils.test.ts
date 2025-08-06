import { describe, it, expect, vi } from 'vitest';
import { 
  formatToHHMMSS, 
  interpolateColor, 
  getContrastColor 
} from '../utils';

describe('Utils Functions', () => {
  describe('formatToHHMMSS', () => {
    it('should format seconds to HH:MM:SS', () => {
      expect(formatToHHMMSS(0)).toBe('00:00:00');
      expect(formatToHHMMSS(59)).toBe('00:00:59');
      expect(formatToHHMMSS(60)).toBe('00:01:00');
      expect(formatToHHMMSS(3661)).toBe('01:01:01');
    });

    it('should handle negative values', () => {
      expect(formatToHHMMSS(-10)).toBe('00:00:00');
    });

    it('should handle large values', () => {
      expect(formatToHHMMSS(86400)).toBe('24:00:00'); // 24 hours
    });
  });

  describe('interpolateColor', () => {
    it('should interpolate between two colors', () => {
      const result = interpolateColor('#FF0000', '#0000FF', 0.5);
      expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return start color when factor is 0', () => {
      const result = interpolateColor('#FF0000', '#0000FF', 0);
      expect(result.toUpperCase()).toBe('#FF0000');
    });

    it('should return end color when factor is 1', () => {
      const result = interpolateColor('#FF0000', '#0000FF', 1);
      expect(result.toUpperCase()).toBe('#0000FF');
    });
  });

  describe('getContrastColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getContrastColor('#000000')).toBe('white');
      expect(getContrastColor('#333333')).toBe('white');
    });

    it('should return black for light backgrounds', () => {
      expect(getContrastColor('#FFFFFF')).toBe('black');
      expect(getContrastColor('#EEEEEE')).toBe('black');
    });

    it('should handle RGB format', () => {
      expect(getContrastColor('rgb(0, 0, 0)')).toBe('white');
      expect(getContrastColor('rgb(255, 255, 255)')).toBe('black');
    });
  });
});