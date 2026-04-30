import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { LevelTheme, TokenType } from '../config/GameConfig';
import { logger } from '../utils/logger';
import type { PlayerState, EnemyState } from '../types/states';
import { BossSystem } from '../systems/BossSystem';
import { TokenSystem } from '../systems/TokenSystem';
import { ParallaxManager } from '../systems/ParallaxManager';
import { LevelManager } from '../systems/LevelManager';

export type { PlayerState, EnemyState };

interface EnemyData {
  state: EnemyState;
  health: number;
  patrolLeft: number;
  patrolRight: number;
  direction: number;
  lastAttackTime: number;
  isAttacking: boolean;
  isDead: boolean;
}

export class GameScene extends Phaser.Scene {
  // Player
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private spellKey!: Phaser.Input.Keyboard.Key;
  private shieldKey!: Phaser.Input.Keyboard.Key;
  private playerState: PlayerState = 'idle';
  private isAttacking = false;
  private playerHealth: number = GameConfig.player.maxHealth;
  private playerMaxHealth: number = GameConfig.player.maxHealth;
  private invincibleUntil = 0;
  private isInvincibleBlinking = false;

  // Systems
  private bossSystem!: BossSystem;
  private tokenSystem!: TokenSystem;
  private parallaxManager!: ParallaxManager;
  private levelManager!: LevelManager;

  // Enemies
  private enemies!: Phaser.Physics.Arcade.Group;

  // Platforms
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  // HUD
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private tokenText!: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text | null = null;
  private score = 0;
  private bossTriggered = false;
  private levelComplete = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelIndex?: number }) {
    const levelIndex = data.levelIndex ?? 0;
    (GameConfig.level as { current: number }).current = levelIndex;
    this.score = 0;
    this.playerHealth = GameConfig.player.maxHealth;
    this.playerState = 'idle';
    this.isAttacking = false;
    this.invincibleUntil = 0;
    this.isInvincibleBlinking = false;
    this.bossTriggered = false;
    this.levelComplete = false;
    logger.info('GameScene init, level:', levelIndex);
  }

  create(): void {
    logger.info('GameScene create started');
    const levelIndex = GameConfig.level.current;

    // Apply debug physics setting from localStorage
    try {
      const raw = localStorage.getItem(GameConfig.ui.localStorageKey);
      if (raw) {
        const settings = JSON.parse(raw);
        this.physics.world.drawDebug = settings.debugPhysics ?? false;
        if (!settings.debugPhysics) this.physics.world.debugGraphic?.clear();
      }
    } catch { /* ignore */ }

    // Initialize level manager
    this.levelManager = new LevelManager(levelIndex);
    this.levelManager.generateLevel(this.cameras.main.height);

    const height = this.cameras.main.height;
    const groundY = this.levelManager.getGroundY();
    const worldWidth = this.levelManager.getWorldWidth();
    const theme = this.levelManager.getTheme();

    // ---- PARALLAX BACKGROUND ----
    this.parallaxManager = new ParallaxManager(this);
    this.parallaxManager.generateTextures(theme, this.cameras.main.width, this.cameras.main.height);
    this.parallaxManager.createLayers(theme);

    // ---- GROUND ----
    const groundGfx = this.add.graphics();
    const themeColors = GameConfig.parallax.themes[theme];
    groundGfx.fillStyle(themeColors.groundColor);
    groundGfx.fillRect(0, groundY, worldWidth, GameConfig.world.groundYOffset);
    groundGfx.fillStyle(themeColors.groundTopColor);
    groundGfx.fillRect(0, groundY, worldWidth, 6);

    // ---- PLATFORMS ----
    this.platforms = this.physics.add.staticGroup();
    const mainGround = this.add.zone(worldWidth / 2, groundY + GameConfig.world.groundYOffset / 2, worldWidth, GameConfig.world.groundYOffset);
    this.physics.add.existing(mainGround, true);
    this.platforms.add(mainGround);

    const platformData = this.levelManager.getPlatforms();
    for (const pp of platformData) {
      const platGfx = this.add.graphics();
      platGfx.fillStyle(0x4a6741);
      platGfx.fillRect(pp.x - pp.w / 2, pp.y, pp.w, 14);
      platGfx.fillStyle(0x6b8f5e);
      platGfx.fillRect(pp.x - pp.w / 2, pp.y, pp.w, 4);
      const platZone = this.add.zone(pp.x, pp.y + 7, pp.w, 14);
      this.physics.add.existing(platZone, true);
      this.platforms.add(platZone);
    }

    // ---- PLAYER ----
    this.player = this.physics.add.sprite(GameConfig.player.spawnX, groundY + GameConfig.player.spawnYOffset, 'char-blue-1', 0);
    this.player.setScale(GameConfig.player.scale);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(GameConfig.player.bodyWidth, GameConfig.player.bodyHeight);
    this.player.body.setOffset(GameConfig.player.bodyOffsetX, GameConfig.player.bodyOffsetY);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);

    // ---- ENEMIES ----
    this.enemies = this.physics.add.group();
    const enemySpawns = this.levelManager.getEnemySpawns();
    for (const sp of enemySpawns) {
      const enemy = this.physics.add.sprite(sp.x, groundY + GameConfig.enemy.spawnYOffset, 'char-red-1', 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      enemy.setScale(GameConfig.enemy.scale);
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(GameConfig.enemy.bodyWidth, GameConfig.enemy.bodyHeight);
      enemy.body.setOffset(GameConfig.enemy.bodyOffsetX, GameConfig.enemy.bodyOffsetY);
      enemy.setDepth(9);
      const data: EnemyData = {
        state: 'patrol',
        health: GameConfig.enemy.health,
        patrolLeft: sp.patrolLeft,
        patrolRight: sp.patrolRight,
        direction: 1,
        lastAttackTime: 0,
        isAttacking: false,
        isDead: false,
      };
      enemy.setData('ai', data);
      this.enemies.add(enemy);
    }
    this.physics.add.collider(this.enemies, this.platforms);

    // ---- TOKENS ----
    this.tokenSystem = new TokenSystem(this);
    const tokenSpawns = this.levelManager.getTokenSpawns();
    const platPositions = platformData.map(p => ({ x: p.x, y: p.y, w: p.w }));
    this.tokenSystem.spawnTokens(groundY, worldWidth, this.levelManager.getLevelData().tokenCount, platPositions);

    // ---- BOSS SYSTEM ----
    this.bossSystem = new BossSystem(this);

    // Player-enemy overlap for combat
    this.physics.add.overlap(this.player, this.enemies, this.handleCombat as any, undefined, this);

    // ---- INPUT ----
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.spellKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.shieldKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.player.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
      if (anim.key === 'player_attack' || anim.key === 'player_attack_combo' || anim.key === 'player_spell') {
        this.isAttacking = false;
      }
    });

    this.player.play('player_idle');

    // ---- CAMERA ----
    this.physics.world.setBounds(0, 0, worldWidth, height);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, GameConfig.camera.followLerpX, GameConfig.camera.followLerpY);
    this.cameras.main.setDeadzone(GameConfig.camera.deadzoneWidth, GameConfig.camera.deadzoneHeight);

    // ---- HUD ----
    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthText = this.add.text(16, 16, 'HP', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);
    this.scoreText = this.add.text(16, 44, 'Score: 0', {
      fontSize: '14px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);
    this.tokenText = this.add.text(GameConfig.hud.tokenCounterX, GameConfig.hud.tokenCounterY, '', {
      fontSize: GameConfig.hud.tokenCounterFontSize,
      color: GameConfig.hud.tokenCounterColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(100);

    this.drawHealthBar();

    // ---- LEVEL NAME DISPLAY ----
    this.showLevelName(this.levelManager.getLevelName());

    this.drawHealthBar();
  }

  private showLevelName(name: string): void {
    const { width } = this.cameras.main;
    this.levelText = this.add.text(width / 2, 80, name, {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: GameConfig.hud.levelNameColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    this.tweens.add({
      targets: this.levelText,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });
    this.tweens.add({
      targets: this.levelText,
      alpha: 0,
      duration: GameConfig.hud.levelNameDuration,
      delay: GameConfig.hud.levelNameDuration,
    });
  }

  update(time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    this.updateParallax();
    this.updatePlayer();
    this.updateEnemies(time);
    this.updateBoss(time);
    this.updateTokens();
    this.updateInvincibilityBlink(time);
    this.drawHealthBar();
    this.checkWinCondition();
  }

  // ---- PARALLAX ----
  private updateParallax(): void {
    this.parallaxManager.update();
  }

  // ---- INVINCIBILITY BLINK ----
  private updateInvincibilityBlink(time: number): void {
    if (time < this.invincibleUntil) {
      if (!this.isInvincibleBlinking) {
        this.isInvincibleBlinking = true;
        this.tweens.add({
          targets: this.player,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: Math.ceil(GameConfig.player.invincibilityDuration / 160),
          onComplete: () => {
            this.player.setAlpha(1);
            this.isInvincibleBlinking = false;
          },
        });
      }
    }
  }

  // ---- PLAYER UPDATE ----
  private updatePlayer(): void {
    const onGround = this.player.body.blocked.down;
    const vy = this.player.body.velocity.y;

    if (this.isAttacking) {
      this.player.setVelocityX(0);
      return;
    }

    // Shield
    if (this.shieldKey.isDown && onGround) {
      this.player.setVelocityX(0);
      this.changePlayerState('shield');
      return;
    }

    // Crouch
    if (this.cursors.down.isDown && onGround && !this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.setVelocityX(0);
      this.changePlayerState('crouch');
      return;
    }

    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.playerState = 'attack';
      this.player.play('player_attack', true);
      this.attackEnemiesInRange(GameConfig.combat.playerAttackRange);
      this.attackBossInRange(GameConfig.combat.playerAttackRange);
      return;
    }

    // Spell
    if (Phaser.Input.Keyboard.JustDown(this.spellKey) && onGround) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.playerState = 'spell';
      this.player.play('player_spell', true);
      this.attackEnemiesInRange(GameConfig.combat.playerSpellRange);
      this.attackBossInRange(GameConfig.combat.playerSpellRange);
      return;
    }

    // Movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-GameConfig.player.moveSpeed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(GameConfig.player.moveSpeed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // Jump
    if (this.cursors.up.isDown && onGround) {
      this.player.setVelocityY(GameConfig.player.jumpVelocity);
    }

    // Animation state
    if (!onGround) {
      this.changePlayerState(vy < 0 ? 'jump' : 'fall');
    } else if (Math.abs(this.player.body.velocity.x) > GameConfig.player.idleVelocityThreshold) {
      this.changePlayerState('run');
    } else {
      this.changePlayerState('idle');
    }
  }

  private changePlayerState(newState: PlayerState): void {
    if (this.playerState === newState) return;
    logger.debug('Player state changed:', this.playerState, '->', newState);
    this.playerState = newState;
    const animMap: Record<PlayerState, string> = {
      idle: 'player_idle', run: 'player_run', jump: 'player_jump_fly',
      fall: 'player_fall', attack: 'player_attack', crouch: 'player_crouch',
      shield: 'player_shield', spell: 'player_spell', damage: 'player_damage',
      death: 'player_death',
    };
    this.playPlayerAnim(animMap[newState]);
  }

  private playPlayerAnim(key: string): void {
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key, true);
    }
  }

  // ---- ENEMY AI ----
  private updateEnemies(time: number): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const ai = enemy.getData('ai') as EnemyData;
      if (ai.isDead) return;
      if (ai.isAttacking) return;

      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

      if (dist < GameConfig.enemy.attackRange && time - ai.lastAttackTime > GameConfig.enemy.attackCooldown) {
        ai.state = 'attack';
        ai.isAttacking = true;
        ai.lastAttackTime = time;
        enemy.setVelocityX(0);
        enemy.play('enemy_attack', true);
        enemy.once('animationcomplete', () => {
          ai.isAttacking = false;
          ai.state = 'patrol';
        });
      } else if (dist < GameConfig.enemy.chaseRange) {
        ai.state = 'chase';
        const dir = this.player.x < enemy.x ? -1 : 1;
        ai.direction = dir;
        enemy.setVelocityX(dir * GameConfig.enemy.chaseSpeed);
        enemy.setFlipX(dir < 0);
        if (enemy.anims.currentAnim?.key !== 'enemy_run') {
          enemy.play('enemy_run', true);
        }
      } else {
        ai.state = 'patrol';
        enemy.setVelocityX(ai.direction * GameConfig.enemy.speed);
        enemy.setFlipX(ai.direction < 0);
        if (enemy.x <= ai.patrolLeft) {
          ai.direction = 1;
        } else if (enemy.x >= ai.patrolRight) {
          ai.direction = -1;
        }
        if (enemy.anims.currentAnim?.key !== 'enemy_walk') {
          enemy.play('enemy_walk', true);
        }
      }
    });
  }

  // ---- BOSS ----
  private updateBoss(time: number): void {
    if (!this.bossSystem.isActive()) {
      // Check if player has reached boss area
      const bossX = this.levelManager.getBossX();
      if (this.bossSystem.shouldSpawnBoss(this.player.x, bossX) && !this.bossTriggered) {
        this.bossTriggered = true;
        this.bossSystem.showBossWarning(GameConfig.level.current);
        const groundY = this.levelManager.getGroundY();
        this.time.delayedCall(GameConfig.boss.warningDuration, () => {
          if (this.bossSystem) {
            this.bossSystem.spawnBoss(bossX + 150, groundY, GameConfig.level.current);
          }
        });
      }
      return;
    }

    this.bossSystem.update(time, this.player.x, this.player.y);

    // Check boss-player collision
    const boss = this.bossSystem.getBoss();
    if (boss && boss.body) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y);
      if (dist < GameConfig.boss.attackRange && this.playerState !== 'shield' && this.playerState !== 'damage' && this.time.now > this.invincibleUntil) {
        const bossData = this.bossSystem.getBossData();
        if (bossData && bossData.isAttacking) {
          this.playerTakeDamage(GameConfig.boss.damageDealt, boss);
        }
      }
    }

    // Check projectile-player collision
    this.physics.add.overlap(this.player, this.bossSystem.getProjectiles(), (playerObj, projObj) => {
      const proj = projObj as Phaser.GameObjects.GameObject;
      if (this.time.now > this.invincibleUntil) {
        this.playerTakeDamage(this.bossSystem.getProjectileDamage(), this.player);
      }
      proj.destroy();
    });
  }

  private attackBossInRange(range: number): void {
    const boss = this.bossSystem.getBoss();
    if (!boss) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y);
    const enemyIsRight = boss.x > this.player.x;
    const facingRight = !this.player.flipX;
    const facingEnemy = (enemyIsRight && facingRight) || (!enemyIsRight && !facingRight);

    if (dist < range && facingEnemy) {
      const damage = range <= GameConfig.combat.playerAttackRange ? 20 : 15; // melee vs spell
      const dir = boss.x > this.player.x ? 1 : -1;
      this.bossSystem.bossTakeDamage(damage, dir);
      this.score += 10;
    }
  }

  // ---- TOKENS ----
  private updateTokens(): void {
    const result = this.tokenSystem.update(this.time.now, this.player.x, this.player.y);
    if (result.scoreGained > 0) {
      this.score += result.scoreGained;
    }
    if (result.healthGained > 0) {
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + result.healthGained);
    }
    const stats = this.tokenSystem.getStats();
    this.tokenText.setText(`${stats.collected}/${stats.total}`);
  }

  // ---- WIN CONDITION ----
  private checkWinCondition(): void {
    if (this.levelComplete) return;

    // Boss defeated = level complete (if level has boss)
    if (this.bossTriggered && this.bossSystem.isDefeated()) {
      this.levelComplete = true;
      this.score += GameConfig.boss.deathScore;
      const stats = this.tokenSystem.getStats();

      this.time.delayedCall(GameConfig.boss.deathDelay, () => {
        if (this.levelManager.hasNextLevel()) {
          // Transition to next level
          this.cameras.main.fadeOut(GameConfig.transition.fadeDuration, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', { levelIndex: GameConfig.level.current + 1 });
          });
        } else {
          // Victory!
          this.cameras.main.fadeOut(GameConfig.transition.fadeDuration, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('VictoryScene', {
              score: this.score,
              tokensCollected: stats.collected,
              totalTokens: stats.total,
            });
          });
        }
      });
    }
  }

  // ---- COMBAT ----
  private handleCombat(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const enemy = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const ai = enemy.getData('ai') as EnemyData;
    if (ai.isDead) {
      logger.error('Combat overlap with dead enemy');
      return;
    }

    if (this.time.now < this.invincibleUntil) return;

    if (ai.isAttacking && this.playerState !== 'shield' && this.playerState !== 'damage') {
      this.playerTakeDamage(GameConfig.player.damageReceived, enemy);
    }
  }

  private attackEnemiesInRange(range: number): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const ai = enemy.getData('ai') as EnemyData;
      if (ai.isDead) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const enemyIsRight = enemy.x > this.player.x;
      const facingRight = !this.player.flipX;
      const facingEnemy = (enemyIsRight && facingRight) || (!enemyIsRight && !facingRight);

      if (dist < range && facingEnemy) {
        this.enemyTakeDamage(enemy, ai, GameConfig.enemy.damageDealt);
      }
    });
  }

  private enemyTakeDamage(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, ai: EnemyData, amount: number): void {
    ai.health -= amount;
    const dir = enemy.x > this.player.x ? 1 : -1;
    enemy.setVelocityX(dir * GameConfig.enemy.knockbackX);
    enemy.setVelocityY(GameConfig.enemy.knockbackY);

    enemy.setTint(0xff0000);
    this.time.delayedCall(GameConfig.enemy.tintDuration, () => enemy.clearTint());

    if (ai.health <= 0) {
      logger.warn('Enemy died at', enemy.x, enemy.y);
      ai.isDead = true;
      ai.state = 'death';
      enemy.play('enemy_death', true);
      enemy.body.enable = false;
      this.score += GameConfig.enemy.deathScore;
      this.scoreText.setText(`Score: ${this.score}`);
      this.time.delayedCall(GameConfig.enemy.deathDelay, () => {
        enemy.destroy();
      });
    } else {
      ai.isAttacking = false;
      enemy.play('enemy_damage', true);
      enemy.once('animationcomplete', () => {
        if (!ai.isDead) enemy.play('enemy_idle', true);
      });
    }
  }

  private playerTakeDamage(amount: number, source: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | Phaser.GameObjects.GameObject): void {
    this.invincibleUntil = this.time.now + GameConfig.player.invincibilityDuration;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    logger.info('Player took damage, health:', this.playerHealth);

    const sourceX = 'x' in source ? (source as { x: number }).x : this.player.x;
    const dir = this.player.x > sourceX ? 1 : -1;
    this.player.setVelocityX(dir * GameConfig.player.knockbackX);
    this.player.setVelocityY(GameConfig.player.knockbackY);

    this.player.setTint(0xff4444);
    this.time.delayedCall(GameConfig.player.damageTintDuration, () => this.player.clearTint());

    this.isAttacking = true;
    this.playerState = 'damage';
    this.player.play('player_damage', true);
    this.player.once('animationcomplete', () => {
      this.isAttacking = false;
      if (this.playerHealth <= 0) {
        this.playerState = 'death';
        this.player.play('player_death', true);
        this.player.body.enable = false;
        this.time.delayedCall(GameConfig.player.restartDelay, () => {
          this.player.setAlpha(1);
          this.scene.start('GameOverScene', {
            score: this.score,
            levelName: this.levelManager.getLevelName(),
          });
        });
      }
    });
  }

  // ---- HUD ----
  private drawHealthBar(): void {
    this.healthBar.clear();
    const { healthBarX: x, healthBarY: y, healthBarWidth: w, healthBarHeight: h } = GameConfig.hud;
    this.healthBar.fillStyle(GameConfig.hud.healthBarBgColor, GameConfig.hud.healthBarBgAlpha);
    this.healthBar.fillRect(x, y, w, h);
    const pct = this.playerHealth / this.playerMaxHealth;
    const color = pct > GameConfig.hud.healthHighThreshold ? GameConfig.hud.healthBarHighColor
      : pct > GameConfig.hud.healthLowThreshold ? GameConfig.hud.healthBarMidColor
      : GameConfig.hud.healthBarLowColor;
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(x, y, w * pct, h);
    this.healthBar.lineStyle(GameConfig.hud.healthBarBorderWidth, GameConfig.hud.healthBarBorderColor, GameConfig.hud.healthBarBorderAlpha);
    this.healthBar.strokeRect(x, y, w, h);
  }
}
