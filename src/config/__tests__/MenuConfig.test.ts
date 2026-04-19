import { describe, it, expect } from 'vitest';
import { MenuConfig } from '../MenuConfig';
import { GameConfig } from '../GameConfig';

describe('MenuConfig', () => {
  describe('parallax', () => {
    it('should have positive scroll speed', () => {
      expect(MenuConfig.parallax.scrollSpeed).toBeGreaterThan(0);
    });

    it('should have layer factors that increase from layer1 to layer3', () => {
      expect(MenuConfig.parallax.layer1Factor).toBeLessThan(MenuConfig.parallax.layer2Factor);
      expect(MenuConfig.parallax.layer2Factor).toBeLessThan(MenuConfig.parallax.layer3Factor);
    });

    it('should have layer factors between 0 and 1', () => {
      expect(MenuConfig.parallax.layer1Factor).toBeGreaterThan(0);
      expect(MenuConfig.parallax.layer3Factor).toBeLessThanOrEqual(1);
    });
  });

  describe('particles', () => {
    it('should have positive count', () => {
      expect(MenuConfig.particles.count).toBeGreaterThan(0);
    });

    it('should have speed min less than speed max', () => {
      expect(MenuConfig.particles.speedMin).toBeLessThan(MenuConfig.particles.speedMax);
    });

    it('should have size min less than size max', () => {
      expect(MenuConfig.particles.sizeMin).toBeLessThan(MenuConfig.particles.sizeMax);
    });

    it('should have alpha min less than alpha max', () => {
      expect(MenuConfig.particles.alphaMin).toBeLessThan(MenuConfig.particles.alphaMax);
    });

    it('should have valid alpha ranges (0-1)', () => {
      expect(MenuConfig.particles.alphaMin).toBeGreaterThan(0);
      expect(MenuConfig.particles.alphaMax).toBeLessThanOrEqual(1);
    });

    it('should have positive speed values', () => {
      expect(MenuConfig.particles.speedMin).toBeGreaterThan(0);
      expect(MenuConfig.particles.speedMax).toBeGreaterThan(0);
    });
  });

  describe('player', () => {
    it('should have xRatio between 0 and 1', () => {
      expect(MenuConfig.player.xRatio).toBeGreaterThan(0);
      expect(MenuConfig.player.xRatio).toBeLessThan(1);
    });

    it('should have positive scale', () => {
      expect(MenuConfig.player.scale).toBeGreaterThan(0);
    });
  });

  describe('enemy', () => {
    it('should have xRatio between 0 and 1', () => {
      expect(MenuConfig.enemy.xRatio).toBeGreaterThan(0);
      expect(MenuConfig.enemy.xRatio).toBeLessThan(1);
    });

    it('should have positive scale', () => {
      expect(MenuConfig.enemy.scale).toBeGreaterThan(0);
    });
  });

  describe('title', () => {
    it('should have positive float duration', () => {
      expect(MenuConfig.title.floatDuration).toBeGreaterThan(0);
    });

    it('should have yRatio between 0 and 1', () => {
      expect(MenuConfig.title.yRatio).toBeGreaterThan(0);
      expect(MenuConfig.title.yRatio).toBeLessThan(1);
    });

    it('should have non-empty font family and font size', () => {
      expect(MenuConfig.title.fontFamily).toBeTruthy();
      expect(MenuConfig.title.fontSize).toBeTruthy();
    });

    it('should have positive stroke thickness', () => {
      expect(MenuConfig.title.strokeThickness).toBeGreaterThan(0);
    });
  });

  describe('playButton', () => {
    it('should have positive dimensions', () => {
      expect(MenuConfig.playButton.width).toBeGreaterThan(0);
      expect(MenuConfig.playButton.height).toBeGreaterThan(0);
    });

    it('should have yRatio between 0 and 1', () => {
      expect(MenuConfig.playButton.yRatio).toBeGreaterThan(0);
      expect(MenuConfig.playButton.yRatio).toBeLessThan(1);
    });

    it('should have hover scale greater than 1', () => {
      expect(MenuConfig.playButton.hoverScale).toBeGreaterThan(1);
    });

    it('should have pulse scale greater than 1', () => {
      expect(MenuConfig.playButton.pulseScale).toBeGreaterThan(1);
    });

    it('should have positive durations', () => {
      expect(MenuConfig.playButton.hoverDuration).toBeGreaterThan(0);
      expect(MenuConfig.playButton.pulseDuration).toBeGreaterThan(0);
      expect(MenuConfig.playButton.fadeOutDuration).toBeGreaterThan(0);
    });

    it('should have positive border radius', () => {
      expect(MenuConfig.playButton.borderRadius).toBeGreaterThan(0);
    });
  });

  describe('settings', () => {
    it('should have positive dimensions', () => {
      expect(MenuConfig.settings.width).toBeGreaterThan(0);
      expect(MenuConfig.settings.height).toBeGreaterThan(0);
    });

    it('should have positive toggle gap', () => {
      expect(MenuConfig.settings.toggleGap).toBeGreaterThan(0);
    });

    it('should have positive open/close durations', () => {
      expect(MenuConfig.settings.openDuration).toBeGreaterThan(0);
      expect(MenuConfig.settings.closeDuration).toBeGreaterThan(0);
    });

    it('should have open scale less than 1', () => {
      expect(MenuConfig.settings.openScale).toBeLessThan(1);
      expect(MenuConfig.settings.openScale).toBeGreaterThan(0);
    });

    it('should have positive close button dimensions', () => {
      expect(MenuConfig.settings.closeBtnWidth).toBeGreaterThan(0);
      expect(MenuConfig.settings.closeBtnHeight).toBeGreaterThan(0);
    });
  });

  describe('toggle', () => {
    it('should have positive dimensions', () => {
      expect(MenuConfig.toggle.width).toBeGreaterThan(0);
      expect(MenuConfig.toggle.height).toBeGreaterThan(0);
    });

    it('should have positive radius', () => {
      expect(MenuConfig.toggle.radius).toBeGreaterThan(0);
    });

    it('should have positive circle radius', () => {
      expect(MenuConfig.toggle.circleRadius).toBeGreaterThan(0);
    });
  });

  describe('icons', () => {
    it('should have positive size', () => {
      expect(MenuConfig.icons.size).toBeGreaterThan(0);
    });

    it('should have positive yFromBottom', () => {
      expect(MenuConfig.icons.yFromBottom).toBeGreaterThan(0);
    });
  });

  describe('ground', () => {
    it('should have positive ground Y offset', () => {
      expect(MenuConfig.ground.groundYOffset).toBeGreaterThan(0);
    });

    it('should have positive top stripe height', () => {
      expect(MenuConfig.ground.topStripeHeight).toBeGreaterThan(0);
    });

    it('should have overlay alpha between 0 and 1', () => {
      expect(MenuConfig.ground.overlayAlpha).toBeGreaterThan(0);
      expect(MenuConfig.ground.overlayAlpha).toBeLessThan(1);
    });
  });

  describe('ui', () => {
    it('should have a non-empty localStorage key', () => {
      expect(MenuConfig.ui.localStorageKey).toBeTruthy();
      expect(typeof MenuConfig.ui.localStorageKey).toBe('string');
    });

    it('should use the same localStorage key as GameConfig', () => {
      expect(MenuConfig.ui.localStorageKey).toBe(GameConfig.ui.localStorageKey);
    });
  });

  describe('camera', () => {
    it('should have positive fade in duration', () => {
      expect(MenuConfig.camera.fadeInDuration).toBeGreaterThan(0);
    });
  });
});
