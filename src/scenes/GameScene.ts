import Phaser from 'phaser';

type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'crouch' | 'damage' | 'death' | 'spell' | 'shield';
type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'damage' | 'death';

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

export class GameScene extends Phaser.Scene {
  // World
  private readonly WORLD_WIDTH = 3200;
  private readonly GROUND_Y_OFFSET = 48;

  // Player
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private spellKey!: Phaser.Input.Keyboard.Key;
  private shieldKey!: Phaser.Input.Keyboard.Key;
  private playerState: PlayerState = 'idle';
  private isAttacking = false;
  private playerHealth = 100;
  private playerMaxHealth = 100;
  private invincibleUntil = 0; // timestamp when i-frames expire
  private isInvincibleBlinking = false;

  // Parallax layers
  private bgLayer1!: Phaser.GameObjects.TileSprite;
  private bgLayer2!: Phaser.GameObjects.TileSprite;
  private bgLayer3!: Phaser.GameObjects.TileSprite;

  // Enemies
  private enemies!: Phaser.Physics.Arcade.Group;
  private readonly ENEMY_COUNT = 6;
  private readonly CHASE_RANGE = 200;
  private readonly ATTACK_RANGE = 45;
  private readonly ENEMY_SPEED = 60;
  private readonly ENEMY_CHASE_SPEED = 100;

  // HUD
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;

  // Tuning
  private readonly MOVE_SPEED = 180;
  private readonly JUMP_VELOCITY = -380;
  private readonly PLAYER_SCALE = 2;
  private readonly ENEMY_SCALE = 1.8;
  private readonly INVINCIBILITY_DURATION = 1000; // ms of i-frames after taking damage

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Apply debug physics setting from localStorage
    try {
      const raw = localStorage.getItem('wizai_settings');
      if (raw) {
        const settings = JSON.parse(raw);
        this.physics.world.drawDebug = settings.debugPhysics ?? false;
        if (!settings.debugPhysics) this.physics.world.debugGraphic?.clear();
      }
    } catch { /* ignore */ }

    const height = this.cameras.main.height;
    const groundY = height - this.GROUND_Y_OFFSET;

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
    groundGfx.fillRect(0, groundY, this.WORLD_WIDTH, this.GROUND_Y_OFFSET);
    groundGfx.fillStyle(0x588157);
    groundGfx.fillRect(0, groundY, this.WORLD_WIDTH, 6);

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
    const mainGround = this.add.zone(this.WORLD_WIDTH / 2, groundY + this.GROUND_Y_OFFSET / 2, this.WORLD_WIDTH, this.GROUND_Y_OFFSET);
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
    this.player = this.physics.add.sprite(100, groundY - 60, 'char-blue-1', 0);
    this.player.setScale(this.PLAYER_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 40);
    this.player.body.setOffset(18, 14);
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

    for (let i = 0; i < this.ENEMY_COUNT; i++) {
      const sp = enemySpawnPoints[i];
      const enemy = this.physics.add.sprite(sp.x, groundY - 60, 'char-red-1', 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      enemy.setScale(this.ENEMY_SCALE);
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(20, 40);
      enemy.body.setOffset(18, 14);
      enemy.setDepth(9);

      const data: EnemyData = {
        state: 'patrol',
        health: 50,
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
    this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, height);
    this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(100, 50);

    // ---- HUD (fixed to camera) ----
    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthText = this.add.text(16, 16, 'HP', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);
    this.scoreText = this.add.text(16, 44, 'Score: 0', {
      fontSize: '14px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);

    const controlsText = this.add.text(this.cameras.main.width - 10, 10,
      '← → Move | ↑ Jump | X Attack | Z Spell | C Shield', {
        fontSize: '11px', color: '#ffffff', backgroundColor: '#00000066',
        padding: { x: 6, y: 4 },
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.drawHealthBar();
  }

  update(time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    this.updateParallax();
    this.updatePlayer();
    this.updateEnemies(time);
    this.updateInvincibilityBlink(time);
    this.drawHealthBar();
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
      // Start blink tween when invincibility begins
      if (!this.isInvincibleBlinking) {
        this.isInvincibleBlinking = true;
        this.tweens.add({
          targets: this.player,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: Math.ceil(this.INVINCIBILITY_DURATION / 160),
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
      this.player.play('player_attack', true); // Force restart even if same anim
      this.attackEnemiesInRange();
      return;
    }

    // Spell
    if (Phaser.Input.Keyboard.JustDown(this.spellKey) && onGround) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.playerState = 'spell';
      this.player.play('player_spell', true); // Force restart even if same anim
      this.attackEnemiesInRange(80);
      return;
    }

    // Movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-this.MOVE_SPEED);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(this.MOVE_SPEED);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // Jump
    if (this.cursors.up.isDown && onGround) {
      this.player.setVelocityY(this.JUMP_VELOCITY);
    }

    // Animation state
    if (!onGround) {
      this.changePlayerState(vy < 0 ? 'jump' : 'fall');
    } else if (Math.abs(this.player.body.velocity.x) > 10) {
      this.changePlayerState('run');
    } else {
      this.changePlayerState('idle');
    }
  }

  private changePlayerState(newState: PlayerState): void {
    if (this.playerState === newState) return;
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

      if (dist < this.ATTACK_RANGE && time - ai.lastAttackTime > 1200) {
        // Attack
        ai.state = 'attack';
        ai.isAttacking = true;
        ai.lastAttackTime = time;
        enemy.setVelocityX(0);
        enemy.play('enemy_attack', true);
        enemy.once('animationcomplete', () => {
          ai.isAttacking = false;
          ai.state = 'patrol';
        });
      } else if (dist < this.CHASE_RANGE) {
        // Chase player
        ai.state = 'chase';
        const dir = this.player.x < enemy.x ? -1 : 1;
        ai.direction = dir;
        enemy.setVelocityX(dir * this.ENEMY_CHASE_SPEED);
        enemy.setFlipX(dir < 0);
        if (enemy.anims.currentAnim?.key !== 'enemy_run') {
          enemy.play('enemy_run', true);
        }
      } else {
        // Patrol
        ai.state = 'patrol';
        enemy.setVelocityX(ai.direction * this.ENEMY_SPEED);
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

  // ---- COMBAT ----
  private handleCombat(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const enemy = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const ai = enemy.getData('ai') as EnemyData;
    if (ai.isDead) return;

    // Check invincibility frames - skip damage if player is still invincible
    if (this.time.now < this.invincibleUntil) return;

    // Enemy attacks player when in attack state
    if (ai.isAttacking && this.playerState !== 'shield' && this.playerState !== 'damage') {
      this.playerTakeDamage(10, enemy);
    }
  }

  private attackEnemiesInRange(range = 60): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const ai = enemy.getData('ai') as EnemyData;
      if (ai.isDead) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      // Check facing direction
      const enemyIsRight = enemy.x > this.player.x;
      const facingRight = !this.player.flipX;
      const facingEnemy = (enemyIsRight && facingRight) || (!enemyIsRight && !facingRight);

      if (dist < range && facingEnemy) {
        this.enemyTakeDamage(enemy, ai, 25);
      }
    });
  }

  private enemyTakeDamage(enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, ai: EnemyData, amount: number): void {
    ai.health -= amount;
    // Knockback
    const dir = enemy.x > this.player.x ? 1 : -1;
    enemy.setVelocityX(dir * 150);
    enemy.setVelocityY(-100);

    // Flash red
    enemy.setTint(0xff0000);
    this.time.delayedCall(150, () => enemy.clearTint());

    if (ai.health <= 0) {
      ai.isDead = true;
      ai.state = 'death';
      enemy.play('enemy_death', true);
      enemy.body.enable = false;
      this.score += 100;
      this.scoreText.setText(`Score: ${this.score}`);
      this.time.delayedCall(1500, () => {
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
    // Set invincibility frames - player cannot take damage again until invincibleUntil passes
    this.invincibleUntil = this.time.now + this.INVINCIBILITY_DURATION;

    this.playerHealth = Math.max(0, this.playerHealth - amount);

    // Knockback
    const dir = this.player.x > source.x ? 1 : -1;
    this.player.setVelocityX(dir * 200);
    this.player.setVelocityY(-120);

    // Flash red
    this.player.setTint(0xff4444);
    this.time.delayedCall(200, () => this.player.clearTint());

    // Brief invincibility via state
    this.isAttacking = true; // Prevents input briefly
    this.playerState = 'damage';
    this.player.play('player_damage', true);
    this.player.once('animationcomplete', () => {
      this.isAttacking = false;
      if (this.playerHealth <= 0) {
        this.playerState = 'death';
        this.player.play('player_death', true);
        this.player.body.enable = false;
        this.time.delayedCall(2000, () => {
          this.player.setAlpha(1);
          this.scene.restart();
        });
      }
    });
  }

  // ---- HUD ----
  private drawHealthBar(): void {
    this.healthBar.clear();
    const x = 40, y = 16, w = 120, h = 16;
    // Background
    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRect(x, y, w, h);
    // Health fill
    const pct = this.playerHealth / this.playerMaxHealth;
    const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xccaa44 : 0xcc4444;
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(x, y, w * pct, h);
    // Border
    this.healthBar.lineStyle(1, 0xffffff, 0.6);
    this.healthBar.strokeRect(x, y, w, h);
  }
}
