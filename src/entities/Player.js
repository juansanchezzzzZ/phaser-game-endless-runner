import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, tileConfig, mapManager) {
        super(scene, x, y, 'player', 21);
        
        this.tileW = tileConfig.tileW;
        this.tileH = tileConfig.tileH;
        this.scene = scene;
        this.mapManager = mapManager; 
        this.heightStep = 25; 

        // Configuración de límites del mapa
        this.minCol = -14; 
        this.maxCol = 14;

        Player.initAnimations(scene);

        scene.add.existing(this);
        this.setOrigin(0.5, 0.75);
        this.setScale(3);
        
        this.isoX = 0;
        this.isoY = 0;
        this.lastStepLeft = false;
        this.isMoving = false;

        this.setupAnimationListener();
        this.updateVisualPosition(false);
    }

    static initAnimations(scene) {
        if (scene.anims.exists('walk_front_left')) return;
        
        const animsData = [
            { key: 'walk_front_left', frame: 13 }, { key: 'walk_front_right', frame: 29 }, { key: 'idle_front', frame: 21 },
            { key: 'walk_back_left', frame: 25 },  { key: 'walk_back_right', frame: 9 },  { key: 'idle_back', frame: 17 },
            { key: 'walk_left_left', frame: 15 },  { key: 'walk_left_right', frame: 31 }, { key: 'idle_left', frame: 23 },
            { key: 'walk_right_left', frame: 27 }, { key: 'walk_right_right', frame: 11 }, { key: 'idle_right', frame: 19 },
            
            { key: 'idle_diag_down_right', frame: 20 }, { key: 'walk_diag_down_right_1', frame: 12 }, { key: 'walk_diag_down_right_2', frame: 28 },
            { key: 'idle_diag_up_left', frame: 16 },    { key: 'walk_diag_up_left_1', frame: 8 },    { key: 'walk_diag_up_left_2', frame: 24 },
            
            { key: 'idle_diag_up_right', frame: 18 },   { key: 'walk_diag_up_right_1', frame: 10 },  { key: 'walk_diag_up_right_2', frame: 26 },
            { key: 'idle_diag_down_left', frame: 22 },  { key: 'walk_diag_down_left_1', frame: 30 }, { key: 'walk_diag_down_left_2', frame: 14 }
        ];

        animsData.forEach(config => {
            scene.anims.create({
                key: config.key,
                frames: [{ key: 'player', frame: config.frame }],
                frameRate: 10,
                repeat: 0
            });
        });
    }

    setupAnimationListener() {
        this.on('animationcomplete', (anim) => {
            if (anim.key.includes('diag')) {
                const dir = anim.key.replace('walk_diag_', '').replace('_1', '').replace('_2', '');
                this.play(`idle_diag_${dir}`);
            } else if (anim.key.includes('walk')) {
                const dir = anim.key.split('_')[1];
                this.play(`idle_${dir}`);
            }
        });
    }

    move(direction) {
        if (this.isMoving) return;

        const currentHeight = this.mapManager.getHeightAt(this.isoX, this.isoY);
        let nextX = this.isoX;
        let nextY = this.isoY;
        let animToPlay = '';

        // Cálculo de posición futura
        if (direction.includes('_')) {
            if (direction === 'down_right') { nextX += 1; nextY += 1; }
            else if (direction === 'up_left') { nextX -= 1; nextY -= 1; }
            else if (direction === 'up_right') { nextX += 1; nextY -= 1; }
            else if (direction === 'down_left') { nextX -= 1; nextY += 1; }
            animToPlay = `walk_diag_${direction}_${this.lastStepLeft ? '1' : '2'}`;
        } else {
            switch (direction) {
                case 'up':    nextY -= 1; animToPlay = 'walk_back_'; break;
                case 'down':  nextY += 1; animToPlay = 'walk_front_'; break;
                case 'left':  nextX -= 1; animToPlay = 'walk_left_'; break;
                case 'right': nextX += 1; animToPlay = 'walk_right_'; break;
            }
            animToPlay += this.lastStepLeft ? 'right' : 'left';
        }

        // --- 1. LÍMITES LATERALES DEL MAPA ---
        if (nextX < this.minCol || nextX > this.maxCol) {
            // Efecto visual de rebote pequeño si intenta salir
            this.scene.tweens.add({
                targets: this,
                scale: 3.2,
                duration: 50,
                yoyo: true
            });
            return; 
        }

        // --- 2. LÍMITE DE ALTURA (COLISIÓN) ---
        const targetHeight = this.mapManager.getHeightAt(nextX, nextY);
        // No puede subir más de 1 bloque de diferencia
        if (targetHeight > currentHeight + 1) return; 

        this.isoX = nextX;
        this.isoY = nextY;
        this.lastStepLeft = !this.lastStepLeft;
        
        this.play(animToPlay);
        this.updateVisualPosition(true, direction);
    }

    updateVisualPosition(isAnimated = true, direction = '') {
        const halfW = this.tileW / 2;
        const halfH = this.tileH / 2;
        const terrainHeight = this.mapManager.getHeightAt(this.isoX, this.isoY);
        const heightOffset = terrainHeight * this.heightStep;

        const targetX = (this.isoX - this.isoY) * halfW;
        const targetY = (this.isoX + this.isoY) * halfH - heightOffset;

        if (isAnimated) {
            this.isMoving = true;
            
            let moveDuration = 150; 
            if (direction === 'down_right' || direction === 'up_left') {
                moveDuration = 130; 
            } else if (direction === 'up_right' || direction === 'down_left') {
                moveDuration = 180; 
            }

            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                duration: moveDuration,
                ease: 'Cubic.easeOut',
                onComplete: () => { this.isMoving = false; }
            });
        } else {
            this.x = targetX;
            this.y = targetY;
        }

        // --- 3. ACTUALIZACIÓN DE PROFUNDIDAD (DEPTH) ---
        // Sincronizado con MapManager: (row * 5000) + (col * 10) + altura
        // Sumamos un pequeño extra (+5) para que el jugador siempre esté delante del suelo que pisa
        const gridRow = this.isoY;
        const gridCol = this.isoX;
        this.setDepth((gridRow * 5000) + (gridCol * 10) + terrainHeight + 5);
    }
}