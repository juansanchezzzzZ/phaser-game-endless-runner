import Phaser from 'phaser';
import Lane from './Lane';
import Road from './Road';

export default class MapManager {
    constructor(scene, tileConfig) {
        this.scene = scene;
        this.tileConfig = tileConfig;

        this.lanes = new Map();
        this.laneTypes = new Map();

        // Grupo que contiene SOLO vehículos
        this.laneGroup = scene.add.group();

        this.horizonBuffer = 50;

        // 🌊 Control de ríos horizontales
        this.riverActive = false;
        this.riverTimer = 0;
    }

    /**
     * Obtiene la altura lógica (Z) en una coordenada isométrica.
     * Usado para colisiones, agua y desniveles.
     */
    getHeightAt(isoX, isoY) {
        const row = Math.floor(isoY);
        const col = Math.floor(isoX);

        const lane = this.lanes.get(row);
        if (!lane) return 0;

        return lane.getHeightOfCol(col);
    }

    /**
     * Inicializa el mundo con filas iniciales.
     */
    init(initialRows) {
        const startRow = -25;

        // 1️⃣ Predecidir tipos (evita cambios al regenerar)
        for (let i = startRow; i <= initialRows + this.horizonBuffer; i++) {
            this.determineType(i);
        }

        // 2️⃣ Crear filas físicas iniciales
        for (let i = startRow; i <= initialRows; i++) {
            this.createRow(i);
        }
    }

    /**
     * Update principal del mapa (llamado desde la Scene).
     */
    update(delta, cameraRow) {
        // 🚗 Actualizar vehículos
        this.laneGroup.getChildren().forEach(vehicle => {
            if (vehicle?.update) {
                vehicle.update(delta);
            }
        });

        // 🌍 Generación procedural hacia adelante
        const currentCamRow = Math.floor(cameraRow);
        const targetRow = currentCamRow + this.horizonBuffer;

        for (let i = currentCamRow - 15; i <= targetRow; i++) {
            this.createRow(i);
        }

        // 🧹 Limpieza de filas antiguas
        this.cleanup(currentCamRow);
    }

    /**
     * Decide el tipo de terreno de una fila (grass, road, river).
     */
    determineType(row) {
        if (this.laneTypes.has(row)) {
            return this.laneTypes.get(row);
        }

        // 🟢 Zona segura inicial
        if (row < 15) {
            this.laneTypes.set(row, 'grass');
            return 'grass';
        }

        const prevType = this.laneTypes.get(row - 1);
        const prev2Type = this.laneTypes.get(row - 2);

        let type = 'grass';

        // 🛣️ Prioridad de carreteras
        let shouldBeRoad = false;

        if (prevType === 'road' && prev2Type !== 'road') {
            shouldBeRoad = Math.random() > 0.4;
        } else if (prevType === 'grass') {
            shouldBeRoad = Math.random() > 0.8;
        }

        if (shouldBeRoad) {
            type = 'road';
            this.riverActive = false;
        } else {
            // 🌊 Ríos horizontales
            if (!this.riverActive && Math.random() < 0.05) {
                this.riverActive = true;
                this.riverTimer = Phaser.Math.Between(2, 4);
            }

            if (this.riverActive) {
                type = 'river';
                this.riverTimer--;
                if (this.riverTimer <= 0) {
                    this.riverActive = false;
                }
            } else {
                type = 'grass';
            }
        }

        this.laneTypes.set(row, type);
        return type;
    }

    /**
     * Crea físicamente una fila si no existe.
     */
    createRow(row) {
        if (this.lanes.has(row)) return;

        const type = this.determineType(row);
        let newLane;

        if (type === 'road') {
            // Road gestiona vehículos y asfalto
            newLane = new Road(this.scene, row, this.tileConfig, this.laneGroup);
        } else {
            // Distancia a carreteras para flora / relieve
            let minDist = 10;
            for (let i = -6; i <= 6; i++) {
                if (this.determineType(row + i) === 'road') {
                    minDist = Math.min(minDist, Math.abs(i));
                }
            }

            const frameToUse = (type === 'river') ? 'river' : 40;

            newLane = new Lane(
                this.scene,
                row,
                frameToUse,
                this.tileConfig,
                minDist
            );
        }

        this.lanes.set(row, newLane);
    }

    /**
     * Elimina filas que quedaron muy atrás.
     */
    cleanup(currentCamRow) {
        const threshold = currentCamRow - 25;

        for (const [row, lane] of this.lanes.entries()) {
            if (row < threshold) {
                lane?.destroy?.();
                this.lanes.delete(row);
                this.laneTypes.delete(row);
            }
        }
    }
}
