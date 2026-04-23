import Phaser from 'phaser';
import { MenuConfig } from '../config/MenuConfig';
import { logger } from '../utils/logger';

export class MenuScene extends Phaser.Scene {
  private bgLayer1!: Phaser.GameObjects.TileSprite;
  private bgLayer2!: Phaser.GameObjects.TileSprite;
  private bgLayer3!: Phaser.GameObjects.TileSprite;
  private scrollSpeed = MenuConfig.parallax.scrollSpeed;
  private particles: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];
  private particleGfx!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playButton!: Phaser.GameObjects.Container;
  private titleFloatTween!: Phaser.Tweens.Tween;
  private settingsContainer!: Phaser.GameObjects.Container;
  private settingsOpen = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    logger.info('MenuScene create started');
    const { width, height } = this.cameras.main;

    // ---- PARALLAX BACKGROUND ----
    this.bgLayer1 = this.add.tileSprite(0, 0, width, height, 'bg-layer1')
      .setOrigin(0, 0).setDepth(0);
    this.bgLayer2 = this.add.tileSprite(0, 0, width, height, 'bg-layer2')
      .setOrigin(0, 0).setDepth(1);
    this.bgLayer3 = this.add.tileSprite(0, 0, width, height, 'bg-layer3')
      .setOrigin(0, 0).setDepth(2);

    // Darken overlay for atmosphere
    const overlay = this.add.graphics().setDepth(3);
    overlay.fillStyle(0x000000, MenuConfig.ground.overlayAlpha);
    overlay.fillRect(0, 0, width, height);

    // ---- GROUND ----
    const groundY = height - MenuConfig.ground.groundYOffset;
    const groundGfx = this.add.graphics().setDepth(4);
    groundGfx.fillStyle(MenuConfig.ground.fillColor);
    groundGfx.fillRect(0, groundY, width, MenuConfig.ground.groundYOffset);
    groundGfx.fillStyle(MenuConfig.ground.topStripeColor);
    groundGfx.fillRect(0, groundY, width, MenuConfig.ground.topStripeHeight);

    // ---- FLOATING PARTICLES ----
    this.particleGfx = this.add.graphics().setDepth(10);
    for (let i = 0; i < MenuConfig.particles.count; i++) {
      this.particles.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height + MenuConfig.particles.yLimitOffset),
        speed: Phaser.Math.FloatBetween(MenuConfig.particles.speedMin, MenuConfig.particles.speedMax),
        size: Phaser.Math.FloatBetween(MenuConfig.particles.sizeMin, MenuConfig.particles.sizeMax),
        alpha: Phaser.Math.FloatBetween(MenuConfig.particles.alphaMin, MenuConfig.particles.alphaMax),
      });
    }

    // ---- PLAYER CHARACTER (animated idle) ----
    this.playerSprite = this.add.sprite(width * MenuConfig.player.xRatio, groundY + MenuConfig.player.groundOffset, 'char-blue-1', 0)
      .setScale(MenuConfig.player.scale)
      .setDepth(8);
    this.playerSprite.play('player_idle');

    // Enemy character on right side
    const enemySprite = this.add.sprite(width * MenuConfig.enemy.xRatio, groundY + MenuConfig.enemy.groundOffset, 'char-red-1', 0)
      .setScale(MenuConfig.enemy.scale)
      .setDepth(8)
      .setFlipX(true);
    enemySprite.play('enemy_idle');

    // ---- TITLE ----
    const titleContainer = this.add.container(width / 2, height * MenuConfig.title.yRatio).setDepth(20);

    // Title shadow
    const titleShadow = this.add.text(3, 3, 'WizAI Game', {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: MenuConfig.title.fontSize,
      color: MenuConfig.title.titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    titleShadow.setAlpha(MenuConfig.title.shadowAlpha);
    titleShadow.setColor(MenuConfig.title.shadowColor);
    titleContainer.add(titleShadow);

    // Title main text
    const titleMain = this.add.text(0, 0, 'WizAI Game', {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: MenuConfig.title.fontSize,
      color: MenuConfig.title.titleColor,
      fontStyle: 'bold',
      stroke: MenuConfig.title.strokeColor,
      strokeThickness: MenuConfig.title.strokeThickness,
    }).setOrigin(0.5);
    titleContainer.add(titleMain);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * MenuConfig.subtitle.yRatio, '— Wizard Quest —', {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: MenuConfig.subtitle.fontSize,
      color: MenuConfig.subtitle.color,
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(20);

    // Float animation on title
    this.titleFloatTween = this.tweens.add({
      targets: titleContainer,
      y: height * MenuConfig.title.yRatio + MenuConfig.title.floatOffset,
      duration: MenuConfig.title.floatDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle pulse
    this.tweens.add({
      targets: subtitle,
      alpha: MenuConfig.subtitle.pulseAlpha,
      duration: MenuConfig.subtitle.pulseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- PLAY BUTTON ----
    this.playButton = this.add.container(width / 2, height * MenuConfig.playButton.yRatio).setDepth(20);

    // Button background
    const btnW = MenuConfig.playButton.width;
    const btnH = MenuConfig.playButton.height;
    const btnBg = this.add.graphics();
    // Shadow
    btnBg.fillStyle(MenuConfig.playButton.shadowColor, MenuConfig.playButton.shadowAlpha);
    btnBg.fillRoundedRect(-btnW / 2 + MenuConfig.playButton.shadowOffset, -btnH / 2 + MenuConfig.playButton.shadowOffset, btnW, btnH, MenuConfig.playButton.borderRadius);
    // Main body
    btnBg.fillStyle(MenuConfig.playButton.bodyColor, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, MenuConfig.playButton.borderRadius);
    // Highlight
    btnBg.fillStyle(MenuConfig.playButton.highlightColor, 1);
    btnBg.fillRoundedRect(-btnW / 2 + MenuConfig.playButton.highlightInset, -btnH / 2 + MenuConfig.playButton.highlightInset, btnW - MenuConfig.playButton.highlightInset * 2, btnH / 2 - MenuConfig.playButton.highlightInset, { tl: 10, tr: 10, bl: 0, br: 0 });
    // Border
    btnBg.lineStyle(MenuConfig.playButton.lineWidth, MenuConfig.playButton.borderColor, MenuConfig.playButton.borderAlpha);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, MenuConfig.playButton.borderRadius);
    this.playButton.add(btnBg);

    // Button text
    const btnText = this.add.text(0, 0, 'PLAY', {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: MenuConfig.playButton.fontSize,
      color: MenuConfig.playButton.fontColor,
      fontStyle: 'bold',
      stroke: MenuConfig.playButton.fontStrokeColor,
      strokeThickness: MenuConfig.playButton.fontStrokeWidth,
    }).setOrigin(0.5);
    this.playButton.add(btnText);

    // Make button interactive
    const hitArea = this.add.zone(0, 0, btnW, btnH);
    this.playButton.add(hitArea);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: this.playButton,
        scaleX: MenuConfig.playButton.hoverScale,
        scaleY: MenuConfig.playButton.hoverScale,
        duration: MenuConfig.playButton.hoverDuration,
        ease: 'Back.easeOut',
      });
      btnText.setColor(MenuConfig.playButton.hoverColor);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: this.playButton,
        scaleX: 1,
        scaleY: 1,
        duration: MenuConfig.playButton.hoverDuration,
        ease: 'Back.easeOut',
      });
      btnText.setColor(MenuConfig.playButton.fontColor);
    });

    hitArea.on('pointerdown', () => {
      logger.info('Transitioning to GameScene');
      this.cameras.main.fadeOut(MenuConfig.playButton.fadeOutDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    });

    // Button pulse glow
    this.tweens.add({
      targets: this.playButton,
      scaleX: MenuConfig.playButton.pulseScale,
      scaleY: MenuConfig.playButton.pulseScale,
      duration: MenuConfig.playButton.pulseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- BOTTOM ICONS ----
    const iconY = height - MenuConfig.icons.yFromBottom;
    const iconStyle = { fontSize: `${MenuConfig.icons.size}px`, color: MenuConfig.icons.fontColor, fontFamily: 'monospace' };

    // Settings icon (left)
    const settingsBtn = this.createIconButton(MenuConfig.icons.size, iconY, '⚙', MenuConfig.icons.size, () => {
      if (!this.settingsOpen) this.showSettings();
    });

    // Info text
    this.add.text(width / 2, height - 16, 'v1.0  |  Arrow Keys + X Z C to play', {
      fontSize: MenuConfig.footer.fontSize,
      color: MenuConfig.footer.color,
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(20);

    // ---- CAMERA FADE IN ----
    this.cameras.main.fadeIn(MenuConfig.camera.fadeInDuration, 0, 0, 0);
  }

  update(_time: number, _delta: number): void {
    // Scroll parallax
    this.bgLayer1.tilePositionX += this.scrollSpeed * MenuConfig.parallax.layer1Factor;
    this.bgLayer2.tilePositionX += this.scrollSpeed * MenuConfig.parallax.layer2Factor;
    this.bgLayer3.tilePositionX += this.scrollSpeed * MenuConfig.parallax.layer3Factor;

    // Update floating particles
    const { width, height } = this.cameras.main;
    this.particleGfx.clear();
    for (const p of this.particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.y * MenuConfig.particles.sineFactor) * MenuConfig.particles.sineAmplitude;
      if (p.y < MenuConfig.particles.respawnYOffset) {
        p.y = height + MenuConfig.particles.spawnYOffset;
        p.x = Phaser.Math.Between(0, width);
      }
      this.particleGfx.fillStyle(MenuConfig.particles.color, p.alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.size);
    }
  }

  private showSettings(): void {
    this.settingsOpen = true;
    const { width, height } = this.cameras.main;
    this.settingsContainer = this.add.container(width / 2, height / 2).setDepth(50);

    // Dim overlay
    const dimOverlay = this.add.graphics();
    dimOverlay.fillStyle(0x000000, MenuConfig.settings.dimOverlayAlpha);
    dimOverlay.fillRect(-width / 2, -height / 2, width, height);
    this.settingsContainer.add(dimOverlay);

    // Panel
    const panelW = MenuConfig.settings.width;
    const panelH = MenuConfig.settings.height;
    const panel = this.add.graphics();
    panel.fillStyle(MenuConfig.settings.bgColor, MenuConfig.settings.bgAlpha);
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, MenuConfig.settings.borderRadius);
    panel.lineStyle(MenuConfig.settings.lineWidth, MenuConfig.settings.borderColor, MenuConfig.settings.borderAlpha);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, MenuConfig.settings.borderRadius);
    this.settingsContainer.add(panel);

    // Title
    const title = this.add.text(0, -panelH / 2 + 28, 'Settings', {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: MenuConfig.settings.titleFontSize,
      color: MenuConfig.settings.titleColor,
      fontStyle: 'bold',
      stroke: MenuConfig.settings.titleStrokeColor,
      strokeThickness: MenuConfig.settings.titleStrokeWidth,
    }).setOrigin(0.5);
    this.settingsContainer.add(title);

    // Load saved settings
    const settings = this.loadSettings();

    // Toggles
    const startY = MenuConfig.settings.toggleStartY;
    const gap = MenuConfig.settings.toggleGap;
    this.createToggle('Music', 0, startY, settings.music, (val) => {
      settings.music = val;
      this.saveSettings(settings);
    });
    this.createToggle('SFX', 0, startY + gap, settings.sfx, (val) => {
      settings.sfx = val;
      this.saveSettings(settings);
    });
    this.createToggle('Debug Physics', 0, startY + gap * 2, settings.debugPhysics, (val) => {
      settings.debugPhysics = val;
      this.saveSettings(settings);
    });

    // Close button
    const closeBtnW = MenuConfig.settings.closeBtnWidth;
    const closeBtnH = MenuConfig.settings.closeBtnHeight;
    const closeBtnY = panelH / 2 - 40;
    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(MenuConfig.settings.closeBtnColor, 1);
    closeBtn.fillRoundedRect(-closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, MenuConfig.settings.closeBtnRadius);
    closeBtn.lineStyle(1, MenuConfig.settings.closeBtnBorder, MenuConfig.settings.closeBtnBorderAlpha);
    closeBtn.strokeRoundedRect(-closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, MenuConfig.settings.closeBtnRadius);
    this.settingsContainer.add(closeBtn);

    const closeText = this.add.text(0, closeBtnY, 'Close', {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: MenuConfig.settings.closeBtnFontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.settingsContainer.add(closeText);

    const closeHit = this.add.zone(0, closeBtnY, closeBtnW, closeBtnH).setInteractive({ useHandCursor: true });
    closeHit.on('pointerover', () => closeText.setColor('#ffdd88'));
    closeHit.on('pointerout', () => closeText.setColor('#ffffff'));
    closeHit.on('pointerdown', () => this.hideSettings());
    this.settingsContainer.add(closeHit);

    // Scale in
    this.settingsContainer.setScale(MenuConfig.settings.openScale).setAlpha(0);
    this.tweens.add({
      targets: this.settingsContainer,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: MenuConfig.settings.openDuration,
      ease: 'Back.easeOut',
    });
  }

  private hideSettings(): void {
    this.tweens.add({
      targets: this.settingsContainer,
      scaleX: MenuConfig.settings.openScale, scaleY: MenuConfig.settings.openScale, alpha: 0,
      duration: MenuConfig.settings.closeDuration,
      ease: 'Power2',
      onComplete: () => {
        this.settingsContainer.destroy();
        this.settingsOpen = false;
      },
    });
  }

  private createToggle(label: string, x: number, y: number, initial: boolean, onChange: (val: boolean) => void): void {
    let isOn = initial;
    const labelText = this.add.text(x + MenuConfig.toggle.labelOffsetX, y, label, {
      fontFamily: MenuConfig.title.fontFamily,
      fontSize: '16px',
      color: '#ccccee',
    }).setOrigin(0, 0.5);
    this.settingsContainer.add(labelText);

    const toggleBg = this.add.graphics();
    const toggleX = x + MenuConfig.toggle.offsetX;
    const drawToggle = () => {
      toggleBg.clear();
      toggleBg.fillStyle(isOn ? MenuConfig.toggle.onColor : MenuConfig.toggle.offColor, 1);
      toggleBg.fillRoundedRect(toggleX - MenuConfig.toggle.width / 2, y - MenuConfig.toggle.height / 2, MenuConfig.toggle.width, MenuConfig.toggle.height, MenuConfig.toggle.radius);
      toggleBg.fillStyle(MenuConfig.toggle.circleColor, 1);
      toggleBg.fillCircle(isOn ? toggleX + 12 : toggleX - 12, y, MenuConfig.toggle.circleRadius);
    };
    drawToggle();
    this.settingsContainer.add(toggleBg);

    const toggleHit = this.add.zone(toggleX, y, MenuConfig.toggle.hitWidth, MenuConfig.toggle.hitHeight).setInteractive({ useHandCursor: true });
    toggleHit.on('pointerdown', () => {
      isOn = !isOn;
      drawToggle();
      onChange(isOn);
      logger.debug('Settings toggled:', label, '->', isOn);
    });
    this.settingsContainer.add(toggleHit);
  }

  private loadSettings(): { music: boolean; sfx: boolean; debugPhysics: boolean } {
    try {
      const raw = localStorage.getItem(MenuConfig.ui.localStorageKey);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { music: true, sfx: true, debugPhysics: false };
  }

  private saveSettings(settings: { music: boolean; sfx: boolean; debugPhysics: boolean }): void {
    try {
      localStorage.setItem(MenuConfig.ui.localStorageKey, JSON.stringify(settings));
    } catch { /* ignore */ }
  }

  private createIconButton(x: number, y: number, icon: string, size: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(20);

    const bg = this.add.graphics();
    bg.fillStyle(MenuConfig.icons.bgColor, MenuConfig.icons.bgAlpha);
    bg.fillCircle(0, 0, size);
    bg.lineStyle(1, MenuConfig.icons.borderColor, MenuConfig.icons.borderAlpha);
    bg.strokeCircle(0, 0, size);
    container.add(bg);

    const text = this.add.text(0, 0, icon, {
      fontSize: `${size}px`,
      color: MenuConfig.icons.fontColor,
    }).setOrigin(0.5);
    container.add(text);

    const hitZone = this.add.zone(0, 0, size * 2, size * 2).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', onClick);
    container.add(hitZone);

    return container;
  }
}
