import Phaser from 'phaser';

export default class Lane {
    constructor(scene, row, frameIndex, tileConfig, distanceToRoad = 10) {
        this.scene = scene;
        this.row = row;
        this.tileW = tileConfig.tileW;
        this.tileH = tileConfig.tileH;

        this.tiles = [];
        this.floraElements = [];
        this.heightMap = {};

        this.heightStep = 25;
        this.distanceToRoad = distanceToRoad;

        // 🔹 NUEVO: control centralizado de agua
        this.waterTiles = [];
        this.waterTimer = null;

        this.createTiles(frameIndex);
        this.initWaterAnimation();
    }

    createTiles(frameIndex) {
        const isRoad = frameIndex === 94;
        const isGrass = frameIndex === 40;
        const isRiverLane = frameIndex === 'river';

        const pathCenter = Math.round(Math.sin(this.row * 0.2) * 5);
        const guaranteedCol = pathCenter;

        for (let col = -25; col <= 25; col++) {
            const distanceFromCenter = Math.abs(col);
            const riverPath = Math.sin(this.row * 0.15) * 6;

            const isVerticalRiver = !isRoad && Math.abs(col - riverPath) < 1.8;
            const isWater = (isRiverLane || isVerticalRiver) && !isRoad;

            let isStoneStep = false;
            if (isWater) {
                if (col === guaranteedCol || col === guaranteedCol + 1) isStoneStep = true;
                else if (Math.random() < 0.05) isStoneStep = true;
                if (this.row === 0 && Math.abs(col) < 2) isStoneStep = true;
            }

            let height = 0;
            if (isWater && !isStoneStep) {
                height = -1;
            } else if (isGrass && !isRoad && !isStoneStep) {
                const terrainMargin = Math.max(0, distanceFromCenter - 4);
                const roadSmoothing = Phaser.Math.Clamp(this.distanceToRoad / 4, 0, 1);
                height = Math.round((Math.pow(terrainMargin, 1.5) * 0.2) * roadSmoothing);
                height = Phaser.Math.Clamp(height, 0, 5);
            }

            this.heightMap[col] = height;
            const startH = (isWater && !isStoneStep) ? -1 : 0;

            for (let h = startH; h <= height; h++) {
                const x = (col - this.row) * (this.tileW / 2);
                const y = (col + this.row) * (this.tileH / 2) - (h * this.heightStep);

                let tileFrame;
                if (isWater && h === height) {
                    tileFrame = isStoneStep ? 68 : Phaser.Math.Between(110, 120);
                } else {
                    tileFrame = (h === height) ? (isRiverLane ? 110 : frameIndex) : 25;
                }

                const tile = this.scene.add.sprite(x, y, 'mapa', tileFrame).setOrigin(0.5);
                tile.setDisplaySize(this.tileW, this.tileW * 1.1);

                const totalDepth = (this.row * 5000) + (col * 10) + h;
                tile.setDepth(totalDepth);

                // 🌊 AGUA (sin timers individuales)
                if (isWater && h === height && !isStoneStep) {
                    tile.setTint(0xbbffff);
                    this.waterTiles.push(tile);

                    if (Math.random() < 0.08) {
                        this.addBubbles(x, y, totalDepth);
                    }
                }
                // 🧱 SOMBRAS DE ALTURA
                else if (h < height) {
                    const shadow = 0.5 + (h * 0.1);
                    tile.setTint(
                        Phaser.Display.Color.GetColor(
                            255 * shadow,
                            255 * shadow,
                            255 * shadow
                        )
                    );
                }

                this.tiles.push(tile);

                // 🌿 FLORA
                if (isGrass && !isWater && h === height && !isRoad && this.row !== 0) {
                    this.addZonedFlora(x, y, totalDepth, distanceFromCenter);
                }
            }
        }
    }

    // 🔹 UN SOLO TIMER PARA TODA LA FILA
    initWaterAnimation() {
        if (this.waterTiles.length === 0) return;

        this.waterTimer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(250, 400),
            loop: true,
            callback: () => {
                this.waterTiles.forEach(tile => {
                    if (tile.active) {
                        tile.setFrame(Phaser.Math.Between(110, 120));
                    }
                });
            }
        });
    }

    addZonedFlora(x, y, depth, dist) {
        let frame;
        let spawnChance = 0;

        if (dist > 6) {
            spawnChance = 0.8;
            frame = Phaser.Math.RND.pick([34, 35, 36]);
        } else if (dist > 1.5) {
            spawnChance = 0.3;
            frame = Phaser.Math.RND.pick([29, 30, 31]);
        } else {
            spawnChance = 0.05;
            frame = 29;
        }

        if (Math.random() < spawnChance) {
            const detail = this.scene.add.sprite(x, y, 'mapa', frame);
            detail.setOrigin(0.5);
            detail.setDisplaySize(this.tileW, this.tileW * 1.1);
            detail.setDepth(depth + 0.1);

            if (Math.random() > 0.5) detail.setFlipX(true);

            const brightness = dist > 6
                ? Phaser.Math.Between(210, 230)
                : Phaser.Math.Between(240, 255);

            detail.setTint(
                Phaser.Display.Color.GetColor(brightness, 255, brightness)
            );

            this.floraElements.push(detail);
        }
    }

    addBubbles(x, y, depth) {
        const frame = Phaser.Math.Between(82, 85);
        const bubbles = this.scene.add.sprite(x, y - 5, 'mapa', frame);

        bubbles.setOrigin(0.5);
        bubbles.setDepth(depth + 0.1);
        bubbles.setAlpha(0.6);

        this.scene.tweens.add({
            targets: bubbles,
            y: y - 20,
            scale: 1.5,
            alpha: 0,
            duration: 1500,
            onComplete: () => bubbles.destroy()
        });

        this.floraElements.push(bubbles);
    }

    getHeightOfCol(col) {
        return this.heightMap[col] ?? 0;
    }

    destroy() {
        if (this.waterTimer) {
            this.waterTimer.remove();
            this.waterTimer = null;
        }

        this.tiles.forEach(t => t.destroy());
        this.floraElements.forEach(f => f.destroy());

        this.tiles = [];
        this.floraElements = [];
        this.waterTiles = [];
        this.heightMap = {};
    }
}
