import Phaser from 'phaser';

export default class Vehicle extends Phaser.GameObjects.Sprite {
    constructor(scene, row, tileConfig) {
        // 1. Decidir dirección primero
        const direction = Math.random() > 0.5 ? 1 : -1;

        // 2. Seleccionar un color aleatorio de la lista de spritesheets cargados
        const colors = [
            'black', 'green', 'light_blue', 'light_grey', 'mid_blue', 
            'mid_grey', 'orange', 'pink', 'purple', 'red', 'white', 'yellow'
        ];
        const selectedColor = Phaser.Math.RND.pick(colors);
        const textureKey = `veh_${selectedColor}`;

        // 3. Lógica de Frames (Cuadrícula 16x12)
        // carTypeRow: Elige una de las 12 filas (tipos de vehículo)
        const carTypeRow = Phaser.Math.Between(0, 11); 
        
        // Determinar columna según tu especificación:
        // Derecha (1) -> Columna 12
        // Izquierda (-1) -> Columna 13
        const col = (direction === 1) ? 12 : 4;
        
        // Cálculo del frame lineal: (Fila * Total Columnas) + Columna
        const finalFrame = (carTypeRow * 16) + col;

        // 4. Inicializar el Sprite
        super(scene, 0, 0, textureKey, finalFrame); 
        
        this.isoRow = row;
        this.isoCol = Phaser.Math.Between(-12, 12);
        this.tileW = tileConfig.tileW;
        this.tileH = tileConfig.tileH;
        
        this.speed = (Math.random() * 0.04) + 0.02;
        this.direction = direction;
        
        // Ajustes visuales para sprites de 64x64
        this.setOrigin(0.5, 0.5); 
        this.setScale(1.8); // Ajusta según el tamaño de tu carretera
        this.flipX = false; 
        
        this.updateScreenPosition();
        scene.add.existing(this);
    }

    update(delta) {
        // Movimiento en el eje de columnas
        this.isoCol += (this.speed * this.direction) * delta * 0.1;

        const limit = 16; 
        if (this.direction === 1 && this.isoCol > limit) {
            this.isoCol = -limit;
        } else if (this.direction === -1 && this.isoCol < -limit) {
            this.isoCol = limit;
        }

        this.updateScreenPosition();
    }

    updateScreenPosition() {
        const halfW = this.tileW / 2;
        const halfH = this.tileH / 2;
        
        // Posicionamiento Isométrico
        this.x = (this.isoCol - this.isoRow) * halfW;
        this.y = (this.isoCol + this.isoRow) * halfH - 4;

        // Sistema de Fila Dominante (Peso 5000) para evitar parpadeos
        const gridRow = Math.floor(this.isoRow);
        const gridCol = Math.floor(this.isoCol);
        const sortingDepth = (gridRow * 5000) + (gridCol * 10) + 100;
        
        this.setDepth(sortingDepth);
    }
}