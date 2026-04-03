import Phaser from 'phaser';

type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'crouch' | 'damage' | 'death' | 'spell' | 'shield';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private spellKey!: Phaser.Input.Keyboard.Key;
  private shieldKey!: Phaser.Input.Keyboard.Key;
  private ground!: Phaser.GameObjects.TileSprite;
  private playerState: PlayerState = 'idle';
  private isAttacking = false;
  private facingRight = true;

  // Tuning constants
  private readonly MOVE_SPEED = 160;
  private readonly JUMP_VELOCITY = -350;
  private readonly PLAYER_SCALE = 2;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Sky gradient background
    const sky = this.add.graphics();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const r = Math.floor(26 + t * 20);
      const g = Math.floor(26 + t * 40);
      const b = Math.floor(46 + t * 60);
      sky.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      sky.fillRect(0, y, width, 1);
    }

    // Ground platform
    const groundY = height - 48;
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x3a5a40);
    groundGfx.fillRect(0, groundY, width, 48);
    // Grass top line
    groundGfx.fillStyle(0x588157);
    groundGfx.fillRect(0, groundY, width, 6);

    // Invisible physics ground
    const groundZone = this.add.zone(width / 2, groundY + 24, width, 48);
    this.physics.add.existing(groundZone, true); // true = static

    // Player
    this.player = this.physics.add.sprite(width / 2, groundY - 60, 'char-blue-1', 0);
    this.player.setScale(this.PLAYER_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 40);
    this.player.body.setOffset(18, 14);

    // Player-ground collision
    this.physics.add.collider(this.player, groundZone);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.spellKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.shieldKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Attack animation complete callback
    this.player.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
      if (anim.key === 'attack' || anim.key === 'attack_combo' || anim.key === 'spell') {
        this.isAttacking = false;
      }
    });

    // Start idle
    this.player.play('idle');

    // HUD text
    this.add.text(10, 10, 'Arrow Keys: Move/Jump | X: Attack | Z: Spell | C: Shield | Down: Crouch', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 4 },
    });
  }

  update(_time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    const onGround = this.player.body.blocked.down;
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;

    // Don't allow movement during attack
    if (this.isAttacking) {
      this.player.setVelocityX(0);
      return;
    }

    // Shield (hold C)
    if (this.shieldKey.isDown && onGround) {
      this.player.setVelocityX(0);
      this.changeState('shield');
      return;
    }

    // Crouch (hold down on ground, not moving)
    if (this.cursors.down.isDown && onGround && !this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.setVelocityX(0);
      this.changeState('crouch');
      return;
    }

    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && onGround) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.changeState('attack');
      return;
    }

    // Spell
    if (Phaser.Input.Keyboard.JustDown(this.spellKey) && onGround) {
      this.isAttacking = true;
      this.player.setVelocityX(0);
      this.playAnim('spell');
      this.playerState = 'spell';
      return;
    }

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-this.MOVE_SPEED);
      this.facingRight = false;
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(this.MOVE_SPEED);
      this.facingRight = true;
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // Jump
    if (this.cursors.up.isDown && onGround) {
      this.player.setVelocityY(this.JUMP_VELOCITY);
    }

    // State machine for animations
    if (!onGround) {
      if (vy < 0) {
        this.changeState('jump');
      } else {
        this.changeState('fall');
      }
    } else if (Math.abs(this.player.body.velocity.x) > 10) {
      this.changeState('run');
    } else {
      this.changeState('idle');
    }
  }

  private changeState(newState: PlayerState): void {
    if (this.playerState === newState) return;
    this.playerState = newState;

    switch (newState) {
      case 'idle':    this.playAnim('idle'); break;
      case 'run':     this.playAnim('run'); break;
      case 'jump':    this.playAnim('jump_fly'); break;
      case 'fall':    this.playAnim('fall'); break;
      case 'attack':  this.playAnim('attack'); break;
      case 'crouch':  this.playAnim('crouch'); break;
      case 'shield':  this.playAnim('shield'); break;
      case 'spell':   this.playAnim('spell'); break;
      case 'damage':  this.playAnim('damage'); break;
      case 'death':   this.playAnim('death'); break;
    }
  }

  private playAnim(key: string): void {
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key, true);
    }
  }
}
