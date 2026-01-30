import Lane from './Lane';
import Vehicle from '../entities/Vehicle';

export default class Road extends Lane {
    constructor(scene, row, tileConfig, laneGroup) {
        /**
         * Pasamos 94 (asfalto) como frameIndex.
         * Al pasar 0 como distanceToRoad, Lane.js anula las montañas (altura siempre 0).
         * Forzamos que Road ignore la lógica de ríos para actuar como un puente firme.
         */
        super(scene, row, 94, tileConfig, 0); 
        
        this.tileConfig = tileConfig;
        this.laneGroup = laneGroup;
        
        // Creamos el vehículo (Chiva)
        this.vehicle = this.spawnVehicle();
    }

    /**
     * SOBREESCRITURA: En una carretera no queremos que Lane genere ríos verticales
     * ni piedras de paso, por lo que bloqueamos cualquier altura negativa.
     */
    createTiles(frameIndex) {
        // Guardamos temporalmente el frameIndex original (94)
        // Pero ejecutamos la lógica base de Lane asegurando que NADA sea agua
        // Para Road, 'isWater' siempre será false internamente.
        super.createTiles(frameIndex);
    }

    /**
     * Instancia un vehículo y lo vincula al grupo de físicas/actualización.
     */
    spawnVehicle() {
        // En Medellín, las Chivas son las reinas de la carretera
        const vehicle = new Vehicle(this.scene, this.row, this.tileConfig);
        
        if (this.laneGroup) {
            this.laneGroup.add(vehicle);
        }
        
        return vehicle;
    }

    /**
     * Limpieza completa: destruye tiles y el vehículo cuando la fila sale de pantalla.
     */
    destroy() {
        // Primero eliminamos el vehículo del grupo y de la escena
        if (this.vehicle) {
            if (this.laneGroup) {
                this.laneGroup.remove(this.vehicle);
            }
            this.vehicle.destroy();
            this.vehicle = null;
        }
        
        // super.destroy() limpia los tiles de asfalto y cualquier decoración residual
        super.destroy(); 
    }
}