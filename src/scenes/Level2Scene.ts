import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Level2Config } from '../config/Level2Config';
import { logger } from '../utils/logger';
import type { PlayerState, EnemyState } from '../types/states';

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

interface FinalBossData {
  state: EnemyState;
  health: number;
  maxHealth: number;
  direction: number;
  lastAttackTime: number;
  lastChargeTime: number;
  isAttacking: boolean;
  isCharging: boolean;
  isDead: boolean;
  ragePhase: number;
}

interface Level2Data {
  playerHealth?: number;
  score?: number;
}

export class Level2Scene extends Phaser.Scene {
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

  private bgLayer1!: Phaser.GameObjects.TileSprite;
  private bgLayer2!: Phaser.GameObjects.TileSprite;
  private bgLayer3!: Phaser.GameObjects.TileSprite;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private killCount = 0;

  private finalBoss!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
  private finalBossActive = false;
  private finalBossHealthBar!: Phaser.GameObjects.Graphics;
  private finalBossNameText!: Phaser.GameObjects.Text;

  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private score = 0;

  constructor() {
    super({ key: 'Level2Scene' });
  }

  create(data: Level2Data): void {
    logger.info('Level2Scene create started with data:', data);

    // Restore player state from Level 1 or use defaults
    this.playerHealth = data.playerHealth ?? GameConfig.player.maxHealth;
    this.score = data.score ?? 0;

    const height = this.cameras.main.height;
    const groundY = height - Level2Config.groundYOffset;

    // Dark atmosphere tint
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // ---- PARALLAX BACKGROUND ----
    this.bgLayer1 = this.add.tileSprite(0, 0, this.cameras.main.width, height, 'bg-layer1')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-30).setTint(0x6666aa);
    this.bgLayer2 = this.add.tileSprite(0, 0, this.cameras.main.width, height, 'bg-layer2')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-20).setTint(0x555588);
    this.bgLayer3 = this.add.tileSprite(0, 0, this.cameras.main.width, height, 'bg-layer3')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-10).setTint(0x444477);

    // ---- GROUND ----
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(Level2Config.groundColor);
    groundGfx.fillRect(0, groundY, Level2Config.worldWidth, Level2Config.groundYOffset);
    groundGfx.fillStyle(Level2Config.groundTopColor);
    groundGfx.fillRect(0, groundY, Level2Config.worldWidth, 6);

    // ---- PLATFORMS ----
    const platforms = this.physics.add.staticGroup();
    this.platforms = platforms;

    const mainGround = this.add.zone(Level2Config.worldWidth / 2, groundY + Level2Config.groundYOffset / 2, Level2Config.worldWidth, Level2Config.groundYOffset);
    this.physics.add.existing(mainGround, true);
    platforms.add(mainGround);

    for (const pp of Level2Config.platformPositions) {
      const platGfx = this.add.graphics();
      platGfx.fillStyle(Level2Config.platformColor);
      platGfx.fillRect(pp.x - pp.w / 2, pp.y, pp.w, 14);
      platGfx.fillStyle(Level2Config.platformTopColor);
      platGfx.fillRect(pp.x - pp.w / 2, pp.y, pp.w, 4);

      const platZone = this.add.zone(pp.x, pp.y + 7, pp.w, 14);
      this.physics.add.existing(platZone, true);
      platforms.add(platZone);
    }

    // ---- PLAYER ----
    this.player = this.physics.add.sprite(Level2Config.playerSpawn.x, groundY + Level2Config.playerSpawn.yOffset, 'char-blue-1', 0);
    this.player.setScale(GameConfig.player.scale);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(GameConfig.player.bodyWidth, GameConfig.player.bodyHeight);
    this.player.body.setOffset(GameConfig.player.bodyOffsetX, GameConfig.player.bodyOffsetY);
    this.player.setDepth(10);

    this.physics.add.collider(this.player, platforms);

    // ---- ENEMIES (10) ----
    this.enemies = this.physics.add.group();

    for (let i = 0; i < GameConfig.levels.level2.enemyCount; i++) {
      const sp = Level2Config.enemySpawnPoints[i];
      const enemy = this.physics.add.sprite(sp.x, groundY + GameConfig.level2Enemy.spawnYOffset, 'char-purple-1', 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      enemy.setScale(GameConfig.level2Enemy.scale);
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(GameConfig.level2Enemy.bodyWidth, GameConfig.level2Enemy.bodyHeight);
      enemy.body.setOffset(GameConfig.level2Enemy.bodyOffsetX, GameConfig.level2Enemy.bodyOffsetY);
      enemy.setDepth(9);

      const data: EnemyData = {
        state: 'patrol',
        health: GameConfig.level2Enemy.health,
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
    this.physics.world.setBounds(0, 0, Level2Config.worldWidth, height);
    this.cameras.main.setBounds(0, 0, Level2Config.worldWidth, height);
    this.cameras.main.startFollow(this.player, true, GameConfig.camera.followLerpX, GameConfig.camera.followLerpY);
    this.cameras.main.setDeadzone(GameConfig.camera.deadzoneWidth, GameConfig.camera.deadzoneHeight);

    // ---- HUD ----
    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthText = this.add.text(16, 16, 'HP', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);
    this.scoreText = this.add.text(16, 44, `Score: ${this.score}`, {
      fontSize: '14px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);
    this.levelText = this.add.text(this.cameras.main.width - 16, 16, 'Level 2', {
      fontSize: '14px', color: '#aa88ff', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Final Boss HUD
    this.finalBossHealthBar = this.add.graphics().setScrollFactor(0).setDepth(100).setVisible(false);
    this.finalBossNameText = this.add.text(this.cameras.main.width / 2, 20, GameConfig.levels.level2.bossName, {
      fontSize: '16px', color: '#aa44ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.drawHealthBar();
  }

  update(time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    this.updateParallax();
    this.updatePlayer();
    this.updateEnemies(time);
    this.updateFinalBoss(time);
    this.updateInvincibilityBlink(time);
    this.drawHealthBar();
    this.drawFinalBossHealthBar();
  }

  private updateParallax(): void {
    const camX = this.cameras.main.scrollX;
    this.bgLayer1.tilePositionX = camX * 0.1;
    this.bgLayer2.tilePositionX = camX * 0.3;
    this.bgLayer3.tilePositionX = camX * 0.6;
  }

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

  private updatePlayer(): void {
    const onGround = this.player.body.blocked.down;
    const vy = this.player.body.velocity.y;

    if (this.isAttacking) {
      this.player.setVelocityX(0);
      return;
    }

    if (this.shieldKey.isDown && onGround) {
      this.player.setVelocityX(0);
      this.changePlayerState('shield');
      return;
    }

    if (this.cursors.down.isDown && onGround && !this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.setVelocityX(0);
      this.changePlayerState('crouch');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.playerState = 'attack';
      this.player.play('player_attack', true);
      this.attackEnemiesInRange(GameConfig.combat.playerAttackRange);
      this.attackFinalBossInRange(GameConfig.combat.playerAttackRange);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.spellKey) && onGround) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.playerState = 'spell';
      this.player.play('player_spell', true);
      this.attackEnemiesInRange(GameConfig.combat.playerSpellRange);
      this.attackFinalBossInRange(GameConfig.combat.playerSpellRange);
      return;
    }

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-GameConfig.player.moveSpeed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(GameConfig.player.moveSpeed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown && onGround) {
      this.player.setVelocityY(GameConfig.player.jumpVelocity);
    }

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

  private updateEnemies(time: number): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const ai = enemy.getData('ai') as EnemyData;
      if (ai.isDead) return;
      if (ai.isAttacking) return;

      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

      if (dist < GameConfig.level2Enemy.attackRange && time - ai.lastAttackTime > GameConfig.level2Enemy.attackCooldown) {
        ai.state = 'attack';
        ai.isAttacking = true;
        ai.lastAttackTime = time;
        enemy.setVelocityX(0);
        enemy.play('level2_enemy_attack', true);
        enemy.once('animationcomplete', () => {
          ai.isAttacking = false;
          ai.state = 'patrol';
        });
      } else if (dist < GameConfig.level2Enemy.chaseRange) {
        ai.state = 'chase';
        const dir = this.player.x < enemy.x ? -1 : 1;
        ai.direction = dir;
        enemy.setVelocityX(dir * GameConfig.level2Enemy.chaseSpeed);
        enemy.setFlipX(dir < 0);
        if (enemy.anims.currentAnim?.key !== 'level2_enemy_run') {
          enemy.play('level2_enemy_run', true);
        }
      } else {
        ai.state = 'patrol';
        enemy.setVelocityX(ai.direction * GameConfig.level2Enemy.speed);
        enemy.setFlipX(ai.direction < 0);

        if (enemy.x <= ai.patrolLeft) {
          ai.direction = 1;
        } else if (enemy.x >= ai.patrolRight) {
          ai.direction = -1;
        }

        if (enemy.anims.currentAnim?.key !== 'level2_enemy_walk') {
          enemy.play('level2_enemy_walk', true);
        }
      }
      logger.debug('Level2 enemy AI state:', ai.state, 'for enemy at', enemy.x, enemy.y);
    });
  }

  // ---- FINAL BOSS SYSTEM ----
  private checkFinalBossSpawn(): void {
    if (this.finalBossActive || this.killCount < GameConfig.levels.level2.enemyCount) return;

    logger.info('Spawning final boss after', this.killCount, 'kills');
    this.spawnFinalBoss();
  }

  private spawnFinalBoss(): void {
    this.finalBossActive = true;
    const height = this.cameras.main.height;
    const groundY = height - Level2Config.groundYOffset;

    this.finalBoss = this.physics.add.sprite(GameConfig.finalBoss.spawnX, groundY + GameConfig.finalBoss.spawnYOffset, 'char-purple-1', 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.finalBoss.setScale(GameConfig.finalBoss.scale);
    this.finalBoss.setCollideWorldBounds(true);
    this.finalBoss.body.setSize(GameConfig.finalBoss.bodyWidth, GameConfig.finalBoss.bodyHeight);
    this.finalBoss.body.setOffset(GameConfig.finalBoss.bodyOffsetX, GameConfig.finalBoss.bodyOffsetY);
    this.finalBoss.setDepth(11);
    this.finalBoss.setFlipX(true);
    this.finalBoss.setTint(0x8800ff);

    const data: FinalBossData = {
      state: 'idle',
      health: GameConfig.finalBoss.health,
      maxHealth: GameConfig.finalBoss.health,
      direction: -1,
      lastAttackTime: 0,
      lastChargeTime: 0,
      isAttacking: false,
      isCharging: false,
      isDead: false,
      ragePhase: 0,
    };
    this.finalBoss.setData('ai', data);

    this.physics.add.collider(this.finalBoss, this.platforms);
    this.physics.add.overlap(this.player, this.finalBoss, this.handleFinalBossCombat as any, undefined, this);

    this.finalBossHealthBar.setVisible(true);
    this.finalBossNameText.setVisible(true);

    this.finalBoss.setAlpha(0);
    this.tweens.add({
      targets: this.finalBoss,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
    });

    this.cameras.main.shake(600, 0.015);

    const warningText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'FINAL BOSS APPEARS!', {
      fontSize: '36px', color: '#aa44ff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({
      targets: warningText,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1800,
      ease: 'Power2',
      onComplete: () => warningText.destroy(),
    });
  }

  private updateFinalBoss(time: number): void {
    if (!this.finalBoss || !this.finalBossActive) return;

    const ai = this.finalBoss.getData('ai') as FinalBossData;
    if (ai.isDead) return;
    if (ai.isCharging) return;
    if (ai.isAttacking) return;

    const dist = Phaser.Math.Distance.Between(this.finalBoss.x, this.finalBoss.y, this.player.x, this.player.y);

    // Rage mechanic: check if health dropped below a new threshold
    const healthPct = ai.health / ai.maxHealth;
    const newRagePhase = Math.floor((1 - healthPct) / GameConfig.finalBoss.rageThreshold);
    if (newRagePhase > ai.ragePhase) {
      ai.ragePhase = newRagePhase;
      logger.warn('Final Boss entered rage phase', ai.ragePhase);
      this.finalBoss.setTint(0xff0044);
      this.time.delayedCall(300, () => this.finalBoss!.setTint(0x8800ff));
      this.cameras.main.shake(300, 0.01);
    }

    const speedMultiplier = 1 + ai.ragePhase * (GameConfig.finalBoss.rageSpeedMultiplier - 1);

    // Charge attack
    if (dist < GameConfig.finalBoss.chaseRange && time - ai.lastChargeTime > GameConfig.finalBoss.chargeCooldown) {
      ai.isCharging = true;
      ai.lastChargeTime = time;
      ai.state = 'attack';

      const dir = this.player.x < this.finalBoss.x ? -1 : 1;
      ai.direction = dir;
      this.finalBoss.setFlipX(dir < 0);
      this.finalBoss.play('final_boss_attack', true);

      this.finalBoss.setVelocityX(dir * GameConfig.finalBoss.chargeSpeed * speedMultiplier);
      this.finalBoss.setVelocityY(-100);

      this.time.delayedCall(GameConfig.finalBoss.chargeDuration, () => {
        if (!ai.isDead) {
          ai.isCharging = false;
          this.finalBoss!.setVelocityX(0);
          ai.state = 'idle';
        }
      });
      return;
    }

    // Regular attack
    if (dist < GameConfig.finalBoss.attackRange && time - ai.lastAttackTime > GameConfig.finalBoss.attackCooldown) {
      ai.state = 'attack';
      ai.isAttacking = true;
      ai.lastAttackTime = time;
      this.finalBoss.setVelocityX(0);

      const dir = this.player.x < this.finalBoss.x ? -1 : 1;
      ai.direction = dir;
      this.finalBoss.setFlipX(dir < 0);
      this.finalBoss.play('final_boss_attack', true);
      this.finalBoss.once('animationcomplete', () => {
        ai.isAttacking = false;
        ai.state = 'idle';
      });
      return;
    }

    // Chase
    if (dist < GameConfig.finalBoss.chaseRange) {
      ai.state = 'chase';
      const dir = this.player.x < this.finalBoss.x ? -1 : 1;
      ai.direction = dir;
      this.finalBoss.setVelocityX(dir * GameConfig.finalBoss.chaseSpeed * speedMultiplier);
      this.finalBoss.setFlipX(dir < 0);
      if (this.finalBoss.anims.currentAnim?.key !== 'final_boss_run') {
        this.finalBoss.play('final_boss_run', true);
      }
    } else {
      ai.state = 'idle';
      this.finalBoss.setVelocityX(0);
      if (this.finalBoss.anims.currentAnim?.key !== 'final_boss_idle') {
        this.finalBoss.play('final_boss_idle', true);
      }
    }
  }

  private handleFinalBossCombat(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    bossObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const boss = bossObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const ai = boss.getData('ai') as FinalBossData;
    if (ai.isDead) return;

    if (this.time.now < this.invincibleUntil) return;

    if ((ai.isAttacking || ai.isCharging) && this.playerState !== 'shield' && this.playerState !== 'damage') {
      this.playerTakeDamage(GameConfig.finalBoss.damageDealt, boss);
    }
  }

  private attackFinalBossInRange(range: number): void {
    if (!this.finalBoss || !this.finalBossActive) return;

    const ai = this.finalBoss.getData('ai') as FinalBossData;
    if (ai.isDead) return;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.finalBoss.x, this.finalBoss.y);
    const bossIsRight = this.finalBoss.x > this.player.x;
    const facingRight = !this.player.flipX;
    const facingBoss = (bossIsRight && facingRight) || (!bossIsRight && !facingRight);

    if (dist < range && facingBoss) {
      this.finalBossTakeDamage(GameConfig.level2Enemy.damageDealt);
    }
  }

  private finalBossTakeDamage(amount: number): void {
    if (!this.finalBoss) return;

    const ai = this.finalBoss.getData('ai') as FinalBossData;
    ai.health -= amount;

    const dir = this.finalBoss.x > this.player.x ? 1 : -1;
    this.finalBoss.setVelocityX(dir * GameConfig.finalBoss.knockbackX);
    this.finalBoss.setVelocityY(GameConfig.finalBoss.knockbackY);

    this.finalBoss.setTint(0xff0000);
    this.time.delayedCall(GameConfig.finalBoss.tintDuration, () => this.finalBoss!.setTint(0x8800ff));

    if (ai.health <= 0) {
      logger.warn('Final Boss defeated!');
      ai.isDead = true;
      ai.state = 'death';
      this.finalBoss.play('final_boss_death', true);
      this.finalBoss.body.enable = false;
      this.score += GameConfig.finalBoss.deathScore;
      this.scoreText.setText(`Score: ${this.score}`);

      this.finalBossHealthBar.setVisible(false);
      this.finalBossNameText.setVisible(false);

      const victoryText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'LEVEL 2 CLEARED!', {
        fontSize: '36px', color: '#44ff44', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      this.tweens.add({
        targets: victoryText,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => victoryText.destroy(),
      });

      this.time.delayedCall(GameConfig.finalBoss.deathDelay, () => {
        this.finalBoss!.destroy();
        this.finalBoss = null;
        this.finalBossActive = false;
        logger.info('Transitioning to VictoryScene with score:', this.score);
        this.scene.start('VictoryScene', { score: this.score });
      });
    } else {
      ai.isAttacking = false;
      this.finalBoss.play('final_boss_damage', true);
      this.finalBoss.once('animationcomplete', () => {
        if (!ai.isDead) this.finalBoss!.play('final_boss_idle', true);
      });
    }
  }

  private drawFinalBossHealthBar(): void {
    if (!this.finalBossActive || !this.finalBoss) return;

    const ai = this.finalBoss.getData('ai') as FinalBossData;
    if (ai.isDead) return;

    this.finalBossHealthBar.clear();
    const w = 320;
    const h = 14;
    const x = (this.cameras.main.width - w) / 2;
    const y = 44;

    this.finalBossHealthBar.fillStyle(0x333333, 0.9);
    this.finalBossHealthBar.fillRect(x, y, w, h);

    const pct = ai.health / ai.maxHealth;
    const color = pct > 0.5 ? 0xaa44ff : pct > 0.25 ? 0xff44aa : 0xff0044;
    this.finalBossHealthBar.fillStyle(color, 1);
    this.finalBossHealthBar.fillRect(x, y, w * pct, h);

    this.finalBossHealthBar.lineStyle(2, 0xffffff, 0.8);
    this.finalBossHealthBar.strokeRect(x, y, w, h);
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
        this.enemyTakeDamage(enemy, ai, GameConfig.level2Enemy.damageDealt);
      }
    });
  }

  private enemyTakeDamage(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, ai: EnemyData, amount: number): void {
    ai.health -= amount;
    const dir = enemy.x > this.player.x ? 1 : -1;
    enemy.setVelocityX(dir * GameConfig.level2Enemy.knockbackX);
    enemy.setVelocityY(GameConfig.level2Enemy.knockbackY);

    enemy.setTint(0xff0000);
    this.time.delayedCall(GameConfig.level2Enemy.tintDuration, () => enemy.clearTint());

    if (ai.health <= 0) {
      logger.warn('Level2 enemy died at', enemy.x, enemy.y);
      ai.isDead = true;
      ai.state = 'death';
      enemy.play('level2_enemy_death', true);
      enemy.body.enable = false;
      this.score += GameConfig.level2Enemy.deathScore;
      this.scoreText.setText(`Score: ${this.score}`);
      this.killCount++;
      this.checkFinalBossSpawn();
      this.time.delayedCall(GameConfig.level2Enemy.deathDelay, () => {
        enemy.destroy();
      });
    } else {
      ai.isAttacking = false;
      enemy.play('level2_enemy_damage', true);
      enemy.once('animationcomplete', () => {
        if (!ai.isDead) enemy.play('level2_enemy_idle', true);
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
          this.scene.restart({ playerHealth: GameConfig.player.maxHealth, score: this.score });
        });
      }
    });
  }

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
