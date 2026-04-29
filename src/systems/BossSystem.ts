import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { logger } from '../utils/logger';
import type { BossState, BossPhase } from '../types/states';
import type { BossAttackPattern } from '../config/GameConfig';
import { isValidBossTransition } from '../types/states';

export interface BossData {
  state: BossState;
  phase: BossPhase;
  health: number;
  maxHealth: number;
  lastAttackTime: number;
  lastProjectileTime: number;
  isAttacking: boolean;
  isDead: boolean;
  direction: number;
}

export class BossSystem {
  private scene: Phaser.Scene;
  private boss: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private bossData: BossData | null = null;
  private bossHealthBar: Phaser.GameObjects.Graphics | null = null;
  private bossNameText: Phaser.GameObjects.Text | null = null;
  private warningText: Phaser.GameObjects.Text | null = null;
  private projectiles: Phaser.Physics.Arcade.Group;
  private bossActive = false;
  private bossWarningShown = false;
  private bossNames: string[] = ['Shadow Guardian', 'Cavern Wraith', 'Crimson Titan'];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.projectiles = scene.physics.add.group();
  }

  /** Check if a boss should spawn based on player position */
  shouldSpawnBoss(playerX: number, bossX: number): boolean {
    return !this.bossActive && playerX >= bossX - 200 && !this.bossWarningShown;
  }

  /** Show the boss warning text before spawning */
  showBossWarning(levelIndex: number): void {
    this.bossWarningShown = true;
    const cfg = GameConfig.boss;
    const name = this.bossNames[levelIndex] ?? 'Dark Guardian';

    // Darken screen
    const overlay = this.scene.add.graphics().setDepth(90).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);

    this.warningText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 20,
      `WARNING`,
      {
        fontFamily: cfg.warningFontFamily,
        fontSize: cfg.warningFontSize,
        color: cfg.warningColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);

    const nameText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 30,
      name,
      {
        fontFamily: cfg.nameFontFamily,
        fontSize: cfg.nameFontSize,
        color: cfg.nameColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);

    // Pulse animation
    this.scene.tweens.add({
      targets: this.warningText,
      alpha: 1,
      duration: cfg.warningDuration / 3,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: nameText,
      alpha: 1,
      duration: cfg.warningDuration / 2,
      ease: 'Power2',
    });

    // Remove warning after duration and spawn boss
    this.scene.time.delayedCall(cfg.warningDuration, () => {
      this.scene.tweens.add({
        targets: [this.warningText, nameText, overlay],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.warningText?.destroy();
          nameText.destroy();
          overlay.destroy();
          this.warningText = null;
        },
      });
    });
  }

  /** Spawn the boss at the specified position */
  spawnBoss(x: number, groundY: number, levelIndex: number): void {
    if (this.bossActive) return;
    const cfg = GameConfig.boss;
    this.bossActive = true;
    logger.info('Spawning boss at', x, groundY);

    this.boss = this.scene.physics.add.sprite(
      x,
      groundY + cfg.spawnYOffset,
      'char-red-1',
      0
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    this.boss.setScale(cfg.scale);
    this.boss.setCollideWorldBounds(true);
    this.boss.body.setSize(cfg.bodyWidth, cfg.bodyHeight);
    this.boss.body.setOffset(cfg.bodyOffsetX, cfg.bodyOffsetY);
    this.boss.setDepth(15);
    this.boss.play('enemy_idle');

    this.bossData = {
      state: 'idle',
      phase: 1,
      health: cfg.health,
      maxHealth: cfg.health,
      lastAttackTime: 0,
      lastProjectileTime: 0,
      isAttacking: false,
      isDead: false,
      direction: -1,
    };

    this.boss.setData('bossData', this.bossData);
    this.createBossHealthBar();
  }

  /** Create the boss health bar HUD element */
  private createBossHealthBar(): void {
    const cfg = GameConfig.boss;
    const { width } = this.scene.cameras.main;
    this.bossHealthBar = this.scene.add.graphics().setScrollFactor(0).setDepth(100);

    const name = this.bossNames[GameConfig.level.current] ?? 'Dark Guardian';
    this.bossNameText = this.scene.add.text(
      width / 2,
      cfg.healthBarY - 5,
      name,
      {
        fontFamily: cfg.nameFontFamily,
        fontSize: '14px',
        color: cfg.nameColor,
        fontStyle: 'bold',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100);
  }

  /** Update boss AI each frame */
  update(time: number, playerX: number, playerY: number): void {
    if (!this.boss || !this.bossData || this.bossData.isDead) return;

    const cfg = GameConfig.boss;
    const dist = Phaser.Math.Distance.Between(
      this.boss.x, this.boss.y, playerX, playerY
    );

    // Update phase based on health
    const healthPercent = this.bossData.health / this.bossData.maxHealth;
    if (healthPercent <= 0.3) {
      this.bossData.phase = 3;
    } else if (healthPercent <= 0.6) {
      this.bossData.phase = 2;
    } else {
      this.bossData.phase = 1;
    }

    // Phase 3: enrage - faster and more aggressive
    const speedMult = this.bossData.phase === 3 ? 1.5 : this.bossData.phase === 2 ? 1.2 : 1.0;
    const cooldownMult = this.bossData.phase === 3 ? 0.6 : 1.0;

    // Projectile attacks in phase 2+
    if (this.bossData.phase >= 2 && !this.bossData.isAttacking) {
      const projectileCount = this.bossData.phase === 3 ? 3 : 1;
      const fireDelay = cfg.projectile.fireRate * cooldownMult;
      if (time - this.bossData.lastProjectileTime > fireDelay) {
        this.fireProjectiles(playerX, playerY, projectileCount);
        this.bossData.lastProjectileTime = time;
      }
    }

    // Melee attack
    if (dist < cfg.attackRange && !this.bossData.isAttacking &&
        time - this.bossData.lastAttackTime > cfg.attackCooldown * cooldownMult) {
      this.bossData.state = 'attack';
      this.bossData.isAttacking = true;
      this.bossData.lastAttackTime = time;
      this.boss.setVelocityX(0);
      this.boss.play('enemy_attack', true);
      this.boss.once('animationcomplete', () => {
        if (this.bossData && !this.bossData.isDead) {
          this.bossData.isAttacking = false;
          this.bossData.state = 'idle';
        }
      });
    } else if (dist < cfg.chaseRange && !this.bossData.isAttacking) {
      // Chase player
      const dir = playerX < this.boss.x ? -1 : 1;
      this.bossData.direction = dir;
      this.boss.setVelocityX(dir * cfg.chaseSpeed * speedMult);
      this.boss.setFlipX(dir < 0);
      if (this.boss.anims.currentAnim?.key !== 'enemy_run') {
        this.boss.play('enemy_run', true);
      }
      this.bossData.state = 'chase';
    } else if (!this.bossData.isAttacking) {
      // Idle patrol
      this.boss.setVelocityX(this.bossData.direction * cfg.speed);
      this.boss.setFlipX(this.bossData.direction < 0);
      if (this.boss.anims.currentAnim?.key !== 'enemy_idle') {
        this.boss.play('enemy_idle', true);
      }
      this.bossData.state = 'idle';
    }

    this.drawBossHealthBar();
  }

  /** Fire projectile(s) toward the player */
  private fireProjectiles(playerX: number, playerY: number, count: number): void {
    if (!this.boss) return;
    const cfg = GameConfig.boss.projectile;

    for (let i = 0; i < count; i++) {
      const proj = this.scene.add.circle(
        this.boss.x, this.boss.y - 10, 6, 0xff44ff
      ) as unknown as Phaser.GameObjects.Arc;
      this.scene.physics.add.existing(proj as unknown as Phaser.GameObjects.GameObject);
      const body = (proj as unknown as Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body }).body;
      body.setCircle(6);

      const baseAngle = Phaser.Math.Angle.Between(
        this.boss.x, this.boss.y, playerX, playerY
      );
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.25 : 0;
      const angle = baseAngle + spread;
      body.setVelocity(
        Math.cos(angle) * cfg.speed,
        Math.sin(angle) * cfg.speed
      );

      this.projectiles.add(proj as unknown as Phaser.GameObjects.GameObject);

      // Auto-destroy after 3 seconds
      this.scene.time.delayedCall(3000, () => {
        proj.destroy();
      });
    }
  }

  /** Check projectile-player collision */
  getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }

  /** Get projectile damage */
  getProjectileDamage(): number {
    return GameConfig.boss.projectile.damage;
  }

  /** Boss takes damage from player attack */
  bossTakeDamage(amount: number, knockbackDir: number): void {
    if (!this.boss || !this.bossData || this.bossData.isDead) return;
    const cfg = GameConfig.boss;

    this.bossData.health = Math.max(0, this.bossData.health - amount);
    this.boss.setVelocityX(knockbackDir * cfg.knockbackX);
    this.boss.setVelocityY(cfg.knockbackY);
    this.boss.setTint(0xff4444);
    this.scene.time.delayedCall(cfg.tintDuration, () => {
      this.boss?.clearTint();
    });

    logger.info('Boss took damage, health:', this.bossData.health, '/', this.bossData.maxHealth);

    if (this.bossData.health <= 0) {
      this.bossDied();
    } else {
      // Brief damage animation
      this.boss.play('enemy_damage', true);
      this.boss.once('animationcomplete', () => {
        if (this.bossData && !this.bossData.isDead) {
          this.boss?.play('enemy_idle', true);
        }
      });
    }
  }

  /** Boss death sequence */
  private bossDied(): void {
    if (!this.boss || !this.bossData) return;
    const cfg = GameConfig.boss;
    logger.info('Boss defeated!');

    this.bossData.isDead = true;
    this.bossData.state = 'death';
    this.boss.play('enemy_death', true);
    this.boss.body.enable = false;

    // Destroy projectiles
    this.projectiles.getChildren().forEach(p => p.destroy());

    // Remove health bar after delay
    this.scene.time.delayedCall(cfg.deathDelay, () => {
      this.boss?.destroy();
      this.boss = null;
      this.bossHealthBar?.destroy();
      this.bossNameText?.destroy();
      this.bossHealthBar = null;
      this.bossNameText = null;
    });
  }

  /** Draw the boss health bar */
  private drawBossHealthBar(): void {
    if (!this.bossHealthBar || !this.bossData) return;
    const cfg = GameConfig.boss;
    const { width } = this.scene.cameras.main;
    const barX = (width - cfg.healthBarWidth) / 2;
    const barY = cfg.healthBarY;

    this.bossHealthBar.clear();
    // Background
    this.bossHealthBar.fillStyle(cfg.healthBarBgColor, cfg.healthBarBgAlpha);
    this.bossHealthBar.fillRect(barX, barY, cfg.healthBarWidth, cfg.healthBarHeight);
    // Health fill
    const pct = this.bossData.health / this.bossData.maxHealth;
    const color = pct > cfg.healthBarHighThreshold ? cfg.healthBarHighColor
      : pct > cfg.healthBarLowThreshold ? cfg.healthBarMidColor
      : cfg.healthBarLowColor;
    this.bossHealthBar.fillStyle(color, 1);
    this.bossHealthBar.fillRect(barX, barY, cfg.healthBarWidth * pct, cfg.healthBarHeight);
    // Border
    this.bossHealthBar.lineStyle(2, cfg.healthBarBorderColor, cfg.healthBarBorderAlpha);
    this.bossHealthBar.strokeRect(barX, barY, cfg.healthBarWidth, cfg.healthBarHeight);
  }

  /** Get boss sprite for collision detection */
  getBoss(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null {
    return this.boss;
  }

  /** Get boss data */
  getBossData(): BossData | null {
    return this.bossData;
  }

  /** Is the boss currently active and alive? */
  isActive(): boolean {
    return this.bossActive && (this.bossData?.isDead === false);
  }

  /** Is the boss defeated? */
  isDefeated(): boolean {
    return this.bossActive && (this.bossData?.isDead === true);
  }

  /** Clean up all boss resources */
  destroy(): void {
    this.boss?.destroy();
    this.bossHealthBar?.destroy();
    this.bossNameText?.destroy();
    this.warningText?.destroy();
    this.projectiles.getChildren().forEach(p => p.destroy());
  }
}
