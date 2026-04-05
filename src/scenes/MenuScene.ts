import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private bgLayer1!: Phaser.GameObjects.TileSprite;
  private bgLayer2!: Phaser.GameObjects.TileSprite;
  private bgLayer3!: Phaser.GameObjects.TileSprite;
  private scrollSpeed = 0.3;
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
    overlay.fillStyle(0x000000, 0.3);
    overlay.fillRect(0, 0, width, height);

    // ---- GROUND ----
    const groundY = height - 48;
    const groundGfx = this.add.graphics().setDepth(4);
    groundGfx.fillStyle(0x3a5a40);
    groundGfx.fillRect(0, groundY, width, 48);
    groundGfx.fillStyle(0x588157);
    groundGfx.fillRect(0, groundY, width, 6);

    // ---- FLOATING PARTICLES ----
    this.particleGfx = this.add.graphics().setDepth(10);
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height - 60),
        speed: Phaser.Math.FloatBetween(0.2, 0.8),
        size: Phaser.Math.FloatBetween(1, 3),
        alpha: Phaser.Math.FloatBetween(0.2, 0.6),
      });
    }

    // ---- PLAYER CHARACTER (animated idle) ----
    this.playerSprite = this.add.sprite(width * 0.18, groundY - 48, 'char-blue-1', 0)
      .setScale(3)
      .setDepth(8);
    this.playerSprite.play('player_idle');

    // Enemy character on right side
    const enemySprite = this.add.sprite(width * 0.82, groundY - 44, 'char-red-1', 0)
      .setScale(2.5)
      .setDepth(8)
      .setFlipX(true);
    enemySprite.play('enemy_idle');

    // ---- TITLE ----
    const titleContainer = this.add.container(width / 2, height * 0.2).setDepth(20);

    // Title shadow
    const titleShadow = this.add.text(3, 3, 'WizAI Game', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    titleShadow.setAlpha(0.5);
    titleContainer.add(titleShadow);

    // Title main text
    const titleMain = this.add.text(0, 0, 'WizAI Game', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#f0c060',
      fontStyle: 'bold',
      stroke: '#5a2d00',
      strokeThickness: 6,
    }).setOrigin(0.5);
    titleContainer.add(titleMain);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.32, '— Wizard Quest —', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c0a0ff',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(20);

    // Float animation on title
    this.titleFloatTween = this.tweens.add({
      targets: titleContainer,
      y: height * 0.2 - 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle pulse
    this.tweens.add({
      targets: subtitle,
      alpha: 0.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- PLAY BUTTON ----
    this.playButton = this.add.container(width / 2, height * 0.55).setDepth(20);

    // Button background
    const btnW = 200;
    const btnH = 60;
    const btnBg = this.add.graphics();
    // Shadow
    btnBg.fillStyle(0x1a1a3a, 0.8);
    btnBg.fillRoundedRect(-btnW / 2 + 3, -btnH / 2 + 3, btnW, btnH, 12);
    // Main body
    btnBg.fillStyle(0x2244aa, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    // Highlight
    btnBg.fillStyle(0x3366cc, 1);
    btnBg.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, btnH / 2 - 4, { tl: 10, tr: 10, bl: 0, br: 0 });
    // Border
    btnBg.lineStyle(2, 0x88aaff, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.playButton.add(btnBg);

    // Button text
    const btnText = this.add.text(0, 0, 'PLAY', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#0a1a4a',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.playButton.add(btnText);

    // Make button interactive
    const hitArea = this.add.zone(0, 0, btnW, btnH);
    this.playButton.add(hitArea);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: this.playButton,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 150,
        ease: 'Back.easeOut',
      });
      btnText.setColor('#ffdd88');
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: this.playButton,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeOut',
      });
      btnText.setColor('#ffffff');
    });

    hitArea.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    });

    // Button pulse glow
    this.tweens.add({
      targets: this.playButton,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- BOTTOM ICONS ----
    const iconY = height - 20;
    const iconStyle = { fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace' };

    // Settings icon (left)
    const settingsBtn = this.createIconButton(40, iconY, '⚙', 15, () => {
      if (!this.settingsOpen) this.showSettings();
    });

    // Info text
    this.add.text(width / 2, height - 16, 'v1.0  |  Arrow Keys + X Z C to play', {
      fontSize: '11px',
      color: '#667788',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(20);

    // ---- CAMERA FADE IN ----
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  update(_time: number, _delta: number): void {
    // Scroll parallax
    this.bgLayer1.tilePositionX += this.scrollSpeed * 0.2;
    this.bgLayer2.tilePositionX += this.scrollSpeed * 0.5;
    this.bgLayer3.tilePositionX += this.scrollSpeed * 1.0;

    // Update floating particles
    const { width, height } = this.cameras.main;
    this.particleGfx.clear();
    for (const p of this.particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.y * 0.02) * 0.3;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Phaser.Math.Between(0, width);
      }
      this.particleGfx.fillStyle(0xaaccff, p.alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.size);
    }
  }

  private showSettings(): void {
    this.settingsOpen = true;
    const { width, height } = this.cameras.main;
    this.settingsContainer = this.add.container(width / 2, height / 2).setDepth(50);

    // Dim overlay
    const dimOverlay = this.add.graphics();
    dimOverlay.fillStyle(0x000000, 0.6);
    dimOverlay.fillRect(-width / 2, -height / 2, width, height);
    this.settingsContainer.add(dimOverlay);

    // Panel
    const panelW = 320;
    const panelH = 260;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a3a, 0.95);
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    panel.lineStyle(2, 0x5566aa, 0.8);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    this.settingsContainer.add(panel);

    // Title
    const title = this.add.text(0, -panelH / 2 + 28, 'Settings', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#f0c060',
      fontStyle: 'bold',
      stroke: '#5a2d00',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.settingsContainer.add(title);

    // Load saved settings
    const settings = this.loadSettings();

    // Toggles
    const startY = -40;
    const gap = 50;
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
    const closeBtnW = 120;
    const closeBtnH = 40;
    const closeBtnY = panelH / 2 - 40;
    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0x443366, 1);
    closeBtn.fillRoundedRect(-closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, 8);
    closeBtn.lineStyle(1, 0x8866bb, 0.6);
    closeBtn.strokeRoundedRect(-closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, 8);
    this.settingsContainer.add(closeBtn);

    const closeText = this.add.text(0, closeBtnY, 'Close', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
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
    this.settingsContainer.setScale(0.8).setAlpha(0);
    this.tweens.add({
      targets: this.settingsContainer,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private hideSettings(): void {
    this.tweens.add({
      targets: this.settingsContainer,
      scaleX: 0.8, scaleY: 0.8, alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.settingsContainer.destroy();
        this.settingsOpen = false;
      },
    });
  }

  private createToggle(label: string, x: number, y: number, initial: boolean, onChange: (val: boolean) => void): void {
    let isOn = initial;
    const labelText = this.add.text(x - 80, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ccccee',
    }).setOrigin(0, 0.5);
    this.settingsContainer.add(labelText);

    const toggleBg = this.add.graphics();
    const toggleX = x + 90;
    const drawToggle = () => {
      toggleBg.clear();
      toggleBg.fillStyle(isOn ? 0x44aa66 : 0x444466, 1);
      toggleBg.fillRoundedRect(toggleX - 22, y - 12, 44, 24, 12);
      toggleBg.fillStyle(0xffffff, 1);
      toggleBg.fillCircle(isOn ? toggleX + 12 : toggleX - 12, y, 9);
    };
    drawToggle();
    this.settingsContainer.add(toggleBg);

    const toggleHit = this.add.zone(toggleX, y, 50, 30).setInteractive({ useHandCursor: true });
    toggleHit.on('pointerdown', () => {
      isOn = !isOn;
      drawToggle();
      onChange(isOn);
    });
    this.settingsContainer.add(toggleHit);
  }

  private loadSettings(): { music: boolean; sfx: boolean; debugPhysics: boolean } {
    try {
      const raw = localStorage.getItem('wizai_settings');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { music: true, sfx: true, debugPhysics: false };
  }

  private saveSettings(settings: { music: boolean; sfx: boolean; debugPhysics: boolean }): void {
    try {
      localStorage.setItem('wizai_settings', JSON.stringify(settings));
    } catch { /* ignore */ }
  }

  private createIconButton(x: number, y: number, icon: string, size: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(20);

    const bg = this.add.graphics();
    bg.fillStyle(0x222244, 0.7);
    bg.fillCircle(0, 0, size);
    bg.lineStyle(1, 0x5566aa, 0.5);
    bg.strokeCircle(0, 0, size);
    container.add(bg);

    const text = this.add.text(0, 0, icon, {
      fontSize: `${size}px`,
      color: '#aabbcc',
    }).setOrigin(0.5);
    container.add(text);

    const hitZone = this.add.zone(0, 0, size * 2, size * 2).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', onClick);
    container.add(hitZone);

    return container;
  }
}
