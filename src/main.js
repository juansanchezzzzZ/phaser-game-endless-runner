import Phaser from 'phaser';
import Player from './entities/Player';
import MapManager from './map/MapManager';
import CameraManager from './map/CameraManager';

const TILE_CONFIG = { tileW: 100, tileH: 60 };

const config = {
    type: Phaser.AUTO,
    // 📱 Ajuste para Iframe y visibilidad
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024, // Aumentamos el ancho base para ver más carriles a los lados
        height: 768  // Aumentamos el alto para ver más profundidad
    },
    backgroundColor: '#87ceeb',
    pixelArt: true,
    autoFocus: true,
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let mapManager;
let cameraManager;
let cursors;
let scoreText;

let maxPlayerRow = 0;
let isGameOver = false;

const inputBuffer = {
    keys: new Set(),
    timer: null
};

function preload() {
    this.load.spritesheet(
        'player',
        'assets/character2_base_16x16.png',
        { frameWidth: 16, frameHeight: 24 }
    );

    this.load.spritesheet(
        'mapa',
        'assets/spritesheet_mapa.png',
        { frameWidth: 32, frameHeight: 32 }
    );

    this.load.image('fondo', 'assets/fondo_montaña.png');

    const vehicleColors = [
        'black', 'green', 'light_blue', 'light_grey',
        'mid_blue', 'mid_grey', 'orange', 'pink',
        'purple', 'red', 'white', 'yellow'
    ];

    vehicleColors.forEach(color => {
        this.load.spritesheet(
            `veh_${color}`,
            `assets/vehicles/${color}.png`,
            { frameWidth: 64, frameHeight: 64 }
        );
    });
}

function create() {
    // 🔗 Foco para Iframe
    this.input.on('pointerdown', () => {
        window.focus();
    });

    // 🎥 CÁMARA: Ajuste de Zoom (0.8 o 0.7 para ver más lejos)
    this.cameras.main.setZoom(0.8);

    // 🌄 Fondo (Escalado para que no se vean bordes con el nuevo zoom)
    const bg = this.add.image(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'fondo'
    );
    bg.setScale(2.5).setScrollFactor(0).setDepth(-2_000_000);

    const sky = this.add.rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        2000,
        2000,
        0x87ceeb
    );
    sky.setScrollFactor(0).setDepth(-1_500_000);

    // 🎮 Estado Inicial
    this.input.keyboard.enabled = true;
    isGameOver = false;
    maxPlayerRow = 0;
    inputBuffer.keys.clear();

    cursors = this.input.keyboard.createCursorKeys();

    // 🌍 Sistemas
    mapManager = new MapManager(this, TILE_CONFIG);
    mapManager.init(25);

    cameraManager = new CameraManager(this, TILE_CONFIG);

    player = new Player(this, 0, 0, TILE_CONFIG, mapManager);

    // 🧮 UI (Usamos valores fijos para que no se muevan con el zoom de la cámara)
    scoreText = this.add.text(40, 40, '0 m', {
        fontSize: '56px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 10,
        fontStyle: 'bold',
        fontFamily: 'Arial Black, sans-serif'
    });
    scoreText.setScrollFactor(0).setDepth(2_000_000);
}

function update(time, delta) {
    if (isGameOver || !player) return;

    cameraManager.update(delta, player.isoY, player.y);
    mapManager.update(delta, cameraManager.isoRow);

    handlePlayerInput.call(this);
    checkLossConditions.call(this);
}

// ⌨️ INPUT
function handlePlayerInput() {
    if (player.isMoving) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.up))    queueInput.call(this, 'up');
    if (Phaser.Input.Keyboard.JustDown(cursors.down))  queueInput.call(this, 'down');
    if (Phaser.Input.Keyboard.JustDown(cursors.left))  queueInput.call(this, 'left');
    if (Phaser.Input.Keyboard.JustDown(cursors.right)) queueInput.call(this, 'right');
}

function queueInput(dir) {
    inputBuffer.keys.add(dir);
    if (inputBuffer.timer) return;

    inputBuffer.timer = this.time.delayedCall(30, () => {
        processBufferedInput.call(this);
    });
}

function processBufferedInput() {
    const keys = inputBuffer.keys;
    let moveDir = null;

    if (keys.has('down') && keys.has('right')) moveDir = 'down_right';
    else if (keys.has('up') && keys.has('left')) moveDir = 'up_left';
    else if (keys.has('up') && keys.has('right')) moveDir = 'up_right';
    else if (keys.has('down') && keys.has('left')) moveDir = 'down_left';
    else if (keys.has('up')) moveDir = 'up';
    else if (keys.has('down')) moveDir = 'down';
    else if (keys.has('left')) moveDir = 'left';
    else if (keys.has('right')) moveDir = 'right';

    if (moveDir) {
        player.move(moveDir);
        updateScore.call(this);
    }

    inputBuffer.keys.clear();
    inputBuffer.timer = null;
}

// 🧮 SCORE
function updateScore() {
    if (player.isoY > maxPlayerRow) {
        maxPlayerRow = Math.floor(player.isoY);
        scoreText.setText(`${maxPlayerRow} m`);

        this.tweens.add({
            targets: scoreText,
            scale: 1.1,
            duration: 50,
            yoyo: true
        });

        cameraManager.increaseDifficulty?.();
    }
}

// 💀 GAME OVER
function checkLossConditions() {
    const fellBehind = cameraManager.checkGameOver(player.isoY);
    const currentHeight = mapManager.getHeightAt(player.isoX, player.isoY);

    const hitVehicle = mapManager.laneGroup
        .getChildren()
        .some(vehicle => {
            const sameRow = Math.round(player.isoY) === vehicle.isoRow;
            const dist = Math.abs(player.isoX - vehicle.isoCol);
            return sameRow && dist < 0.7 && currentHeight <= 0;
        });

    const drowned = currentHeight === -1;

    if (fellBehind || hitVehicle || drowned) {
        let reason = 'normal';
        if (drowned) reason = 'water';
        if (fellBehind) reason = 'camera';
        gameOver.call(this, reason);
    }
}

function gameOver(reason) {
    if (isGameOver) return;
    isGameOver = true;

    this.input.keyboard.enabled = false;

    // 🚀 Comunicación con App de Ranking
    if (window.parent) {
        window.parent.postMessage({
            type: 'GAME_OVER',
            score: maxPlayerRow,
            reason: reason
        }, '*');
    }

    if (reason === 'water') {
        this.tweens.add({
            targets: player,
            y: player.y + 40,
            alpha: 0,
            duration: 600,
            onStart: () => player.setTint(0x00ffff)
        });
    } else if (reason === 'camera') {
        player.setTint(0x222222);
        this.tweens.add({ targets: player, alpha: 0, scale: 0.5, duration: 400 });
    } else {
        this.cameras.main.shake(250, 0.03);
        player.setTint(0xff0000);
        player.setAngle(90);
    }

    this.time.delayedCall(1500, () => {
        this.scene.restart();
    });
}