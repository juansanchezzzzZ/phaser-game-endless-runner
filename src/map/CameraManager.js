import Phaser from 'phaser';

export default class CameraManager {
    constructor(scene, tileConfig) {
        this.scene = scene;
        this.tileW = tileConfig.tileW;
        this.tileH = tileConfig.tileH;
        
        this.isoRow = -5; 
        
        // --- VELOCIDAD CORREGIDA ---
        // Valores mucho más pequeños para compensar el multiplicador delta
        this.speed = 0.0002; 
        this.maxSpeed = 0.001; 
        this.difficultyIncrement = 0.000005; 
        
        this.deadZone = 12; 
        this.maxForwardAdvantage = 3; 
        this.catchUpLerp = 0.02; // Muy suave

        this.heightLerpFactor = 0.05; 
        this.currentVisualY = 0;
    }

    update(delta, playerIsoY, playerVisualY) {
        // Avance automático corregido para delta de 60fps
        this.isoRow += this.speed * delta;

        // Suavizado de persecución
        const threshold = this.isoRow + this.maxForwardAdvantage;
        if (playerIsoY > threshold) {
            this.isoRow += (playerIsoY - threshold) * this.catchUpLerp;
        }

        const camX = (0 - this.isoRow) * (this.tileW / 2);
        const logicCamY = (0 + this.isoRow) * (this.tileH / 2);

        if (playerVisualY !== undefined) {
            const targetCamY = logicCamY + ((playerVisualY - logicCamY) * 0.6); 
            if (this.currentVisualY === 0) this.currentVisualY = targetCamY;
            this.currentVisualY = Phaser.Math.Linear(this.currentVisualY, targetCamY, this.heightLerpFactor);
        } else {
            this.currentVisualY = logicCamY;
        }

        // Redondeo para evitar temblores
        this.scene.cameras.main.centerOn(Math.round(camX), Math.round(this.currentVisualY));
    }

    checkGameOver(playerIsoY) {
        return playerIsoY < (this.isoRow - this.deadZone);
    }

    increaseDifficulty() {
        if (this.speed < this.maxSpeed) {
            this.speed += this.difficultyIncrement;
        }
    }
}