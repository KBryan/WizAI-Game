import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { logger } from '../utils/logger';
import type { PlayerState, EnemyState } from '../types/states';

export type { PlayerState, EnemyState };

interface EnemyData {
  state: EnemyState;
  health: number;
  patrolLeft: number;
  patrolRight: number;
  direction: number; // 1 = right, -1 = left
  lastAttackTime: number;
  isAttacking: boolean;
  isDead: boolean;
}

interface BossData {
  state: EnemyState;
  health: number;
  direction: number;
  lastAttackTime: number;
  lastChargeTime: number;
  isAttacking: boolean;
  isCharging: boolean;
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
  private invincibleUntil = 0; // timestamp when i-frames expire
  private isInvincibleBlinking = false;

  // Parallax layers
  private bgLayer1!: Phaser.GameObjects.TileSprite;
  private bgLayer2!: Phaser.GameObjects.TileSprite;
  private bgLayer3!: Phaser.GameObjects.TileSprite;

  // Enemies
  private enemies!: Phaser.Physics.Arcade.Group;
  private killCount = 0;

  // Boss
  private boss!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
  private bossActive = false;
  private bossHealthBar!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;

  // HUD
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    logger.info('GameScene create started');

    // Apply debug physics setting from localStorage
    try {
      const raw = localStorage.getItem(GameConfig.ui.localStorageKey);
      if (raw) {
        const settings = JSON.parse(raw);
        this.physics.world.drawDebug = settings.debugPhysics ?? false;
        if (!settings.debugPhysics) this.physics.world.debugGraphic?.clear();
      }
    } catch { /* ignore */ }

    const height = this.cameras.main.height;
    const groundY = height - GameConfig.world.groundYOffset;

    // ---- PARALLAX BACKGROUND ----
    this.bgLayer1 = this.add.tileSprite(0, 0, this.cameras.main.width, height, 'bg-layer1')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-30);
    this.bgLayer2 = this.add.tileSprite(0, 0, this.cameras.main.width, height, 'bg-layer2')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-20);
    this.bgLayer3 = this.add.tileSprite(0, 0, this.cameras.main.width, height, 'bg-layer3')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-10);

    // ---- GROUND ----
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x3a5a40);
    groundGfx.fillRect(0, groundY, GameConfig.world.width, GameConfig.world.groundYOffset);
    groundGfx.fillStyle(0x588157);
    groundGfx.fillRect(0, groundY, GameConfig.world.width, 6);

    // Some floating platforms
    const platformPositions = [
      { x: 500, y: groundY - 100, w: 150 },
      { x: 900, y: groundY - 70, w: 120 },
      { x: 1300, y: groundY - 120, w: 180 },
      { x: 1800, y: groundY - 90, w: 140 },
      { x: 2200, y: groundY - 130, w: 160 },
      { x: 2700, y: groundY - 80, w: 130 },
    ];
    const platforms = this.physics.add.staticGroup();

    // Main ground
    const mainGround = this.add.zone(GameConfig.world.width / 2, groundY + GameConfig.world.groundYOffset / 2, GameConfig.world.width, GameConfig.world.groundYOffset);
    this.physics.add.existing(mainGround, true);
    platforms.add(mainGround);

    // Floating platforms
    for (const pp of platformPositions) {
      const platGfx = this.add.graphics();
      platGfx.fillStyle(0x4a6741);
      platGfx.fillRect(pp.x - pp.w / 2, pp.y, pp.w, 14);
      platGfx.fillStyle(0x6b8f5e);
      platGfx.fillRect(pp.x - pp.w / 2, pp.y, pp.w, 4);

      const platZone = this.add.zone(pp.x, pp.y + 7, pp.w, 14);
      this.physics.add.existing(platZone, true);
      platforms.add(platZone);
    }

    // ---- PLAYER ----
    this.player = this.physics.add.sprite(GameConfig.player.spawnX, groundY + GameConfig.player.spawnYOffset, 'char-blue-1', 0);
    this.player.setScale(GameConfig.player.scale);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(GameConfig.player.bodyWidth, GameConfig.player.bodyHeight);
    this.player.body.setOffset(GameConfig.player.bodyOffsetX, GameConfig.player.bodyOffsetY);
    this.player.setDepth(10);

    this.physics.add.collider(this.player, platforms);

    // ---- ENEMIES ----
    this.enemies = this.physics.add.group();
    const enemySpawnPoints = [
      { x: 400, patrolL: 300, patrolR: 550 },
      { x: 700, patrolL: 600, patrolR: 850 },
      { x: 1100, patrolL: 1000, patrolR: 1250 },
      { x: 1600, patrolL: 1500, patrolR: 1750 },
      { x: 2100, patrolL: 2000, patrolR: 2250 },
      { x: 2600, patrolL: 2500, patrolR: 2750 },
    ];

    for (let i = 0; i < GameConfig.enemy.count; i++) {
      const sp = enemySpawnPoints[i];
      const enemy = this.physics.add.sprite(sp.x, groundY + GameConfig.enemy.spawnYOffset, 'char-red-1', 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      enemy.setScale(GameConfig.enemy.scale);
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(GameConfig.enemy.bodyWidth, GameConfig.enemy.bodyHeight);
      enemy.body.setOffset(GameConfig.enemy.bodyOffsetX, GameConfig.enemy.bodyOffsetY);
      enemy.setDepth(9);

      const data: EnemyData = {
        state: 'patrol',
        health: GameConfig.enemy.health,
        patrolLeft: sp.patrolL,
        patrolRight: sp.patrolR,
        direction: 1,
        lastAttackTime: 0,
        isAttacking: false,
        isDead: false,
      };
      enemy.setData('ai', data);
      this.enemies.add(enemy);
    }

    this.physics.add.collider(this.enemies, platforms);

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
    this.physics.world.setBounds(0, 0, GameConfig.world.width, height);
    this.cameras.main.setBounds(0, 0, GameConfig.world.width, height);
    this.cameras.main.startFollow(this.player, true, GameConfig.camera.followLerpX, GameConfig.camera.followLerpY);
    this.cameras.main.setDeadzone(GameConfig.camera.deadzoneWidth, GameConfig.camera.deadzoneHeight);

    // ---- HUD (fixed to camera) ----
    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthText = this.add.text(16, 16, 'HP', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);
    this.scoreText = this.add.text(16, 44, 'Score: 0', {
      fontSize: '14px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);

    // Boss HUD (hidden until boss spawns)
    this.bossHealthBar = this.add.graphics().setScrollFactor(0).setDepth(100).setVisible(false);
    this.bossNameText = this.add.text(this.cameras.main.width / 2, 20, 'FOREST GUARDIAN', {
      fontSize: '16px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.drawHealthBar();
  }

  update(time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    this.updateParallax();
    this.updatePlayer();
    this.updateEnemies(time);
    this.updateBoss(time);
    this.updateInvincibilityBlink(time);
    this.drawHealthBar();
    this.drawBossHealthBar();
  }

  // ---- PARALLAX ----
  private updateParallax(): void {
    const camX = this.cameras.main.scrollX;
    this.bgLayer1.tilePositionX = camX * 0.1;
    this.bgLayer2.tilePositionX = camX * 0.3;
    this.bgLayer3.tilePositionX = camX * 0.6;
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
      logger.debug('Enemy AI state:', ai.state, 'for enemy at', enemy.x, enemy.y);
    });
  }

  // ---- BOSS SYSTEM ----
  private checkBossSpawn(): void {
    if (this.bossActive || this.killCount < GameConfig.boss.triggerKills) return;

    logger.info('Spawning boss after', this.killCount, 'kills');
    this.spawnBoss();
  }

  private spawnBoss(): void {
    this.bossActive = true;
    const height = this.cameras.main.height;
    const groundY = height - GameConfig.world.groundYOffset;

    this.boss = this.physics.add.sprite(GameConfig.boss.spawnX, groundY + GameConfig.boss.spawnYOffset, 'char-green-1', 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.boss.setScale(GameConfig.boss.scale);
    this.boss.setCollideWorldBounds(true);
    this.boss.body.setSize(GameConfig.boss.bodyWidth, GameConfig.boss.bodyHeight);
    this.boss.body.setOffset(GameConfig.boss.bodyOffsetX, GameConfig.boss.bodyOffsetY);
    this.boss.setDepth(11);
    this.boss.setFlipX(true);

    const data: BossData = {
      state: 'idle',
      health: GameConfig.boss.health,
      direction: -1,
      lastAttackTime: 0,
      lastChargeTime: 0,
      isAttacking: false,
      isCharging: false,
      isDead: false,
    };
    this.boss.setData('ai', data);

    // Get platforms group from existing collider
    const platforms = this.physics.world.staticBodies;
    // We need to add collider with platforms - find the ground
    const ground = this.physics.add.staticBody(0, groundY, GameConfig.world.width, GameConfig.world.groundYOffset);
    this.physics.add.collider(this.boss, ground as any);

    // Add overlap with player for combat
    this.physics.add.overlap(this.player, this.boss, this.handleBossCombat as any, undefined, this);

    // Show boss HUD
    this.bossHealthBar.setVisible(true);
    this.bossNameText.setVisible(true);

    // Spawn animation
    this.boss.setAlpha(0);
    this.tweens.add({
      targets: this.boss,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
    });

    // Screen shake
    this.cameras.main.shake(500, 0.01);

    // Boss entrance text
    const warningText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'BOSS APPEARS!', {
      fontSize: '32px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({
      targets: warningText,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => warningText.destroy(),
    });
  }

  private updateBoss(time: number): void {
    if (!this.boss || !this.bossActive) return;

    const ai = this.boss.getData('ai') as BossData;
    if (ai.isDead) return;
    if (ai.isCharging) return;
    if (ai.isAttacking) return;

    const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);

    // Charge attack logic
    if (dist < GameConfig.boss.chaseRange && time - ai.lastChargeTime > GameConfig.boss.chargeCooldown) {
      ai.isCharging = true;
      ai.lastChargeTime = time;
      ai.state = 'attack';

      const dir = this.player.x < this.boss.x ? -1 : 1;
      ai.direction = dir;
      this.boss.setFlipX(dir < 0);
      this.boss.play('boss_attack', true);

      // Charge!
      this.boss.setVelocityX(dir * GameConfig.boss.chargeSpeed);
      this.boss.setVelocityY(-100);

      this.time.delayedCall(GameConfig.boss.chargeDuration, () => {
        if (!ai.isDead) {
          ai.isCharging = false;
          this.boss!.setVelocityX(0);
          ai.state = 'idle';
        }
      });
      return;
    }

    // Regular attack
    if (dist < GameConfig.boss.attackRange && time - ai.lastAttackTime > GameConfig.boss.attackCooldown) {
      ai.state = 'attack';
      ai.isAttacking = true;
      ai.lastAttackTime = time;
      this.boss.setVelocityX(0);

      const dir = this.player.x < this.boss.x ? -1 : 1;
      ai.direction = dir;
      this.boss.setFlipX(dir < 0);
      this.boss.play('boss_attack', true);
      this.boss.once('animationcomplete', () => {
        ai.isAttacking = false;
        ai.state = 'idle';
      });
      return;
    }

    // Chase
    if (dist < GameConfig.boss.chaseRange) {
      ai.state = 'chase';
      const dir = this.player.x < this.boss.x ? -1 : 1;
      ai.direction = dir;
      this.boss.setVelocityX(dir * GameConfig.boss.chaseSpeed);
      this.boss.setFlipX(dir < 0);
      if (this.boss.anims.currentAnim?.key !== 'boss_run') {
        this.boss.play('boss_run', true);
      }
    } else {
      // Idle/walk in place
      ai.state = 'idle';
      this.boss.setVelocityX(0);
      if (this.boss.anims.currentAnim?.key !== 'boss_idle') {
        this.boss.play('boss_idle', true);
      }
    }
  }

  private handleBossCombat(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    bossObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const boss = bossObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const ai = boss.getData('ai') as BossData;
    if (ai.isDead) return;

    if (this.time.now < this.invincibleUntil) return;

    if ((ai.isAttacking || ai.isCharging) && this.playerState !== 'shield' && this.playerState !== 'damage') {
      this.playerTakeDamage(GameConfig.boss.damageDealt, boss);
    }
  }

  private attackBossInRange(range: number): void {
    if (!this.boss || !this.bossActive) return;

    const ai = this.boss.getData('ai') as BossData;
    if (ai.isDead) return;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
    const bossIsRight = this.boss.x > this.player.x;
    const facingRight = !this.player.flipX;
    const facingBoss = (bossIsRight && facingRight) || (!bossIsRight && !facingRight);

    if (dist < range && facingBoss) {
      this.bossTakeDamage(GameConfig.enemy.damageDealt);
    }
  }

  private bossTakeDamage(amount: number): void {
    if (!this.boss) return;

    const ai = this.boss.getData('ai') as BossData;
    ai.health -= amount;

    const dir = this.boss.x > this.player.x ? 1 : -1;
    this.boss.setVelocityX(dir * GameConfig.boss.knockbackX);
    this.boss.setVelocityY(GameConfig.boss.knockbackY);

    this.boss.setTint(0xff0000);
    this.time.delayedCall(GameConfig.boss.tintDuration, () => this.boss!.clearTint());

    if (ai.health <= 0) {
      logger.warn('Boss defeated!');
      ai.isDead = true;
      ai.state = 'death';
      this.boss.play('boss_death', true);
      this.boss.body.enable = false;
      this.score += GameConfig.boss.deathScore;
      this.scoreText.setText(`Score: ${this.score}`);

      // Hide boss HUD
      this.bossHealthBar.setVisible(false);
      this.bossNameText.setVisible(false);

      // Victory text
      const victoryText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'VICTORY!', {
        fontSize: '40px', color: '#44ff44', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      this.tweens.add({
        targets: victoryText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.time.delayedCall(GameConfig.boss.deathDelay, () => {
        this.boss!.destroy();
        this.boss = null;
        this.bossActive = false;
      });
    } else {
      ai.isAttacking = false;
      this.boss.play('boss_damage', true);
      this.boss.once('animationcomplete', () => {
        if (!ai.isDead) this.boss!.play('boss_idle', true);
      });
    }
  }

  private drawBossHealthBar(): void {
    if (!this.bossActive || !this.boss) return;

    const ai = this.boss.getData('ai') as BossData;
    if (ai.isDead) return;

    this.bossHealthBar.clear();
    const w = 300;
    const h = 12;
    const x = (this.cameras.main.width - w) / 2;
    const y = 40;

    // Background
    this.bossHealthBar.fillStyle(0x333333, 0.9);
    this.bossHealthBar.fillRect(x, y, w, h);

    // Health
    const pct = ai.health / GameConfig.boss.health;
    const color = pct > 0.5 ? 0xff4444 : pct > 0.25 ? 0xff8844 : 0xff0000;
    this.bossHealthBar.fillStyle(color, 1);
    this.bossHealthBar.fillRect(x, y, w * pct, h);

    // Border
    this.bossHealthBar.lineStyle(2, 0xffffff, 0.8);
    this.bossHealthBar.strokeRect(x, y, w, h);
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
      this.killCount++;
      this.checkBossSpawn();
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

  private playerTakeDamage(amount: number, source: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    this.invincibleUntil = this.time.now + GameConfig.player.invincibilityDuration;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    logger.info('Player took damage, health:', this.playerHealth);

    const dir = this.player.x > source.x ? 1 : -1;
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
          this.scene.restart();
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
