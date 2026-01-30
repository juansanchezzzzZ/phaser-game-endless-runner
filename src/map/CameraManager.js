import Phaser from 'phaser';

export default class CameraManager {
    constructor(scene, tileConfig) {
        this.scene = scene;
        this.tileW = tileConfig.tileW;
        this.tileH = tileConfig.tileH;
        
        this.isoRow = -5; 
        
        // --- PROPIEDADES DE VELOCIDAD ---
        this.speed = 0.01; 
        this.maxSpeed = 0.03; // Tope máximo (ajústalo según pruebes)
        this.difficultyIncrement = 0.0001; // Cuánto aumenta por cada punto
        
        this.deadZone = 15; 
        this.maxForwardAdvantage = 4; 
        this.catchUpLerp = 0.08; 

        this.heightLerpFactor = 0.1; 
        this.currentVisualY = 0;
    }

    update(delta, playerIsoY, playerVisualY) {
        // 1. Avance automático constante
        this.isoRow += this.speed * delta * 0.1;

        // 2. LÓGICA DE ENGANCHE (Smooth Catch-up)
        const threshold = this.isoRow + this.maxForwardAdvantage;
        if (playerIsoY > threshold) {
            const diff = playerIsoY - threshold;
            this.isoRow += diff * this.catchUpLerp;
        }

        // 3. Cálculo de coordenadas Isométricas
        const camX = (0 - this.isoRow) * (this.tileW / 2);
        const logicCamY = (0 + this.isoRow) * (this.tileH / 2);

        // 4. Gestión del Relieve
        if (playerVisualY !== undefined) {
            const verticalDiff = playerVisualY - logicCamY;
            const targetCamY = logicCamY + (verticalDiff * 0.8); 
            if (this.currentVisualY === 0) this.currentVisualY = targetCamY;
            this.currentVisualY = Phaser.Math.Linear(this.currentVisualY, targetCamY, this.heightLerpFactor);
        } else {
            this.currentVisualY = logicCamY;
        }

        this.scene.cameras.main.centerOn(camX, this.currentVisualY);
    }

    checkGameOver(playerIsoY) {
        return playerIsoY < (this.isoRow - this.deadZone);
    }

    increaseDifficulty() {
        // Solo aumentamos si no hemos llegado al máximo permitido
        if (this.speed < this.maxSpeed) {
            this.speed += this.difficultyIncrement;
            
            // Opcional: Para que sea más pulido, a medida que te acercas 
            // al máximo, el incremento podría ser más pequeño
            // this.speed += (this.maxSpeed - this.speed) * 0.01;
        }
    }
}