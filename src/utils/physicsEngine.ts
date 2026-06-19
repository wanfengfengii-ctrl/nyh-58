import Matter from 'matter-js';
import type { RaftConfig, Cargo, PhysicsState, CargoPhysicsState, WeatherWaterEffects } from '../types';
import { PHYSICS_CONSTANTS } from '../constants';
import { calculateRaftDimensions, generateBambooTubes, calculateTubeVolume } from './raftGeometry';
import { calculateWeatherEffects } from './weatherWater';

const { Engine, World, Bodies, Body, Events, Vector } = Matter;

export class RaftPhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private raftBody: Matter.Body | null = null;
  private cargoBodies: Map<string, Matter.Body> = new Map();
  private config: RaftConfig;
  private cargos: Cargo[] = [];
  private isRunning = false;
  private isPaused = false;
  private waterLevel = 0;
  private time = 0;
  private raftInitialY = 0;
  private tubeBodies: Matter.Body[] = [];
  private weatherEffects: WeatherWaterEffects = {
    flowSpeedMultiplier: 1.0,
    stabilityPenalty: 0,
    waveHeight: 0,
    visibility: 1.0,
  };

  constructor(config: RaftConfig) {
    this.config = config;
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = PHYSICS_CONSTANTS.GRAVITY;
    this.updateWeatherEffects();
    this.createRaft();
  }

  private updateWeatherEffects(): void {
    if (this.config.weatherWater) {
      this.weatherEffects = calculateWeatherEffects(this.config.weatherWater);
    }
  }

  private createRaft(): void {
    if (this.raftBody) {
      World.remove(this.world, this.raftBody);
      this.tubeBodies.forEach((tube) => World.remove(this.world, tube));
    }

    const dims = calculateRaftDimensions(this.config);
    const tubes = generateBambooTubes(this.config);
    this.tubeBodies = [];

    tubes.forEach((tube) => {
      const tubeBody = Bodies.rectangle(
        tube.x,
        tube.y,
        tube.diameter,
        tube.length,
        {
          density: tube.density,
          friction: PHYSICS_CONSTANTS.CARGO_FRICTION_COEFFICIENT,
          frictionStatic: PHYSICS_CONSTANTS.CARGO_FRICTION_COEFFICIENT * 1.5,
          restitution: 0.1,
        }
      );
      this.tubeBodies.push(tubeBody);
    });

    const raftWidth = dims.width;
    const raftHeight = dims.height;
    const raftVolume = tubes.reduce((sum, tube) => sum + calculateTubeVolume(tube), 0);
    const raftMass = raftVolume * this.config.tubeDensity;

    this.raftBody = Body.create({
      parts: this.tubeBodies,
      position: { x: 0, y: 0 },
      friction: PHYSICS_CONSTANTS.CARGO_FRICTION_COEFFICIENT,
      frictionStatic: PHYSICS_CONSTANTS.CARGO_FRICTION_COEFFICIENT * 1.5,
      restitution: 0.1,
      density: raftMass / (raftWidth * raftHeight),
    });

    this.raftInitialY = -raftHeight / 4;
    Body.setPosition(this.raftBody, { x: 0, y: this.raftInitialY });

    World.add(this.world, this.raftBody);
  }

  private createCargoBody(cargo: Cargo): Matter.Body {
    const body = Bodies.rectangle(cargo.x, cargo.y, cargo.width, cargo.height, {
      density: cargo.weight / (cargo.width * cargo.height),
      friction: PHYSICS_CONSTANTS.CARGO_FRICTION_COEFFICIENT,
      frictionStatic: PHYSICS_CONSTANTS.CARGO_FRICTION_COEFFICIENT * 1.2,
      restitution: 0.05,
    });
    return body;
  }

  private calculateBuoyancy(): void {
    if (!this.raftBody) return;

    const dims = calculateRaftDimensions(this.config);
    const raftAngle = this.raftBody.angle;
    const halfWidth = dims.width / 2;
    const halfHeight = dims.height / 2;

    const cosAngle = Math.cos(raftAngle);
    const sinAngle = Math.sin(raftAngle);

    let submergedVolume = 0;
    const waterSurfaceY = this.waterLevel;

    for (let i = 0; i < this.tubeBodies.length; i++) {
      const tube = this.tubeBodies[i];
      const localX = tube.position.x - this.raftBody.position.x;
      const localY = tube.position.y - this.raftBody.position.y;

      const rotatedY = localX * sinAngle + localY * cosAngle;
      const worldY = this.raftBody.position.y + rotatedY;

      const tubeRadius = tube.bounds.max.x - tube.bounds.min.x;
      const tubeLength = tube.bounds.max.y - tube.bounds.min.y;

      const depth = waterSurfaceY - (worldY - tubeLength / 2);
      if (depth > 0) {
        const submergedHeight = Math.min(depth, tubeLength);
        const submergedArea = this.calculateSubmergedArea(tubeRadius, submergedHeight);
        submergedVolume += submergedArea * tubeLength;
      }
    }

    const buoyancyForce = this.config.waterDensity * PHYSICS_CONSTANTS.GRAVITY * submergedVolume;
    const buoyancyVector = { x: 0, y: -buoyancyForce };

    const centerOfBuoyancy = this.calculateCenterOfBuoyancy(halfWidth, halfHeight, raftAngle, waterSurfaceY);
    Body.applyForce(this.raftBody, centerOfBuoyancy, buoyancyVector);
  }

  private calculateSubmergedArea(radius: number, depth: number): number {
    if (depth <= 0) return 0;
    if (depth >= 2 * radius) return Math.PI * radius * radius;

    const h = depth;
    const r = radius;
    const term = r - h;
    const sqrtTerm = Math.sqrt(2 * r * h - h * h);
    return r * r * Math.acos(term / r) - term * sqrtTerm;
  }

  private calculateCenterOfBuoyancy(
    halfWidth: number,
    halfHeight: number,
    angle: number,
    waterSurfaceY: number
  ): { x: number; y: number } {
    if (!this.raftBody) return { x: 0, y: 0 };

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const raftX = this.raftBody.position.x;
    const raftY = this.raftBody.position.y;

    let totalSubmergedArea = 0;
    let weightedX = 0;
    let weightedY = 0;

    const sampleCount = 20;
    for (let i = 0; i < sampleCount; i++) {
      const localX = -halfWidth + (i / sampleCount) * 2 * halfWidth + halfWidth / sampleCount;
      for (let j = 0; j < sampleCount; j++) {
        const localY = -halfHeight + (j / sampleCount) * 2 * halfHeight + halfHeight / sampleCount;

        const rotatedX = localX * cosAngle - localY * sinAngle;
        const rotatedY = localX * sinAngle + localY * cosAngle;
        const worldY = raftY + rotatedY;

        if (worldY > waterSurfaceY) {
          const area = (2 * halfWidth / sampleCount) * (2 * halfHeight / sampleCount);
          totalSubmergedArea += area;
          weightedX += (raftX + rotatedX) * area;
          weightedY += worldY * area;
        }
      }
    }

    if (totalSubmergedArea === 0) {
      return { x: raftX, y: raftY };
    }

    return {
      x: weightedX / totalSubmergedArea,
      y: weightedY / totalSubmergedArea,
    };
  }

  private applyWaterDrag(): void {
    if (!this.raftBody) return;

    const dims = calculateRaftDimensions(this.config);
    const velocity = this.raftBody.velocity;
    const speed = Vector.magnitude(velocity);

    if (speed > 0.01) {
      const crossSectionalArea = dims.width * (dims.height / 2);
      const dragMagnitude =
        0.5 *
        this.config.waterDensity *
        PHYSICS_CONSTANTS.WATER_DRAG_COEFFICIENT *
        crossSectionalArea *
        speed *
        speed;

      const dragDirection = Vector.neg(velocity);
      const dragVector = Vector.mult(Vector.normalise(dragDirection), dragMagnitude / 1000);

      Body.applyForce(this.raftBody, this.raftBody.position, dragVector);
    }

    const angularVelocity = this.raftBody.angularVelocity;
    const angularDrag = -angularVelocity * PHYSICS_CONSTANTS.ANGULAR_DAMPING * 0.1;
    Body.setAngularVelocity(this.raftBody, angularVelocity + angularDrag);

    this.cargoBodies.forEach((cargoBody) => {
      const cargoVelocity = cargoBody.velocity;
      const cargoSpeed = Vector.magnitude(cargoVelocity);
      if (cargoSpeed > 0.01) {
        const cargoArea = (cargoBody.bounds.max.x - cargoBody.bounds.min.x) * 
                          (cargoBody.bounds.max.y - cargoBody.bounds.min.y);
        const cargoDragMagnitude =
          0.5 *
          this.config.waterDensity *
          PHYSICS_CONSTANTS.WATER_DRAG_COEFFICIENT *
          cargoArea *
          cargoSpeed *
          cargoSpeed;
        const cargoDragDirection = Vector.neg(cargoVelocity);
        const cargoDragVector = Vector.mult(Vector.normalise(cargoDragDirection), cargoDragMagnitude / 1000);
        Body.applyForce(cargoBody, cargoBody.position, cargoDragVector);
      }
    });
  }

  private applyWaterFlow(): void {
    if (!this.raftBody) return;

    let flowSpeed = this.config.waterFlowSpeed * this.weatherEffects.flowSpeedMultiplier;
    const mode = this.config.waterFlowMode;

    if (mode === 'pulse') {
      const pulse = Math.sin(this.time * this.config.pulseFrequency * 2 * Math.PI);
      flowSpeed *= (1 + pulse * this.config.pulseIntensity * 0.5);
    } else if (mode === 'random') {
      const randomFactor = 0.5 + Math.random();
      flowSpeed *= randomFactor;
    }

    const flowForce = { x: flowSpeed * 0.01, y: 0 };

    if (this.raftBody.position.y > this.waterLevel - 0.5) {
      Body.applyForce(this.raftBody, this.raftBody.position, flowForce);
    }

    this.cargoBodies.forEach((cargoBody) => {
      if (cargoBody.position.y > this.waterLevel - 0.5) {
        Body.applyForce(cargoBody, cargoBody.position, { x: flowForce.x * 0.8, y: 0 });
      }
    });

    this.applyWindForce();
    this.applyWaveTurbulence();
  }

  private applyWindForce(): void {
    if (!this.raftBody) return;

    const windConfig = this.config.weatherWater?.wind;
    if (!windConfig || windConfig === 'calm') return;

    const windStrengthMap: Record<string, number> = {
      breeze: 0.003,
      windy: 0.012,
      strong: 0.03,
    };
    const windStrength = windStrengthMap[windConfig] || 0;
    if (windStrength === 0) return;

    const gustFactor = 1 + Math.sin(this.time * 3) * 0.3 + Math.sin(this.time * 7) * 0.2;
    const windForceX = windStrength * gustFactor;
    const windForceY = windStrength * 0.1 * Math.sin(this.time * 5);

    if (this.raftBody.position.y > this.waterLevel - 1.0) {
      Body.applyForce(this.raftBody, {
        x: this.raftBody.position.x,
        y: this.raftBody.position.y - 0.3,
      }, { x: windForceX, y: windForceY });
    }

    this.cargoBodies.forEach((cargoBody) => {
      if (cargoBody.position.y > this.waterLevel - 1.0) {
        const cargoArea = (cargoBody.bounds.max.x - cargoBody.bounds.min.x) *
                          (cargoBody.bounds.max.y - cargoBody.bounds.min.y);
        const cargoWindFactor = Math.min(1.5, cargoArea * 0.5);
        Body.applyForce(cargoBody, cargoBody.position, {
          x: windForceX * 0.6 * cargoWindFactor,
          y: windForceY * 0.3 * cargoWindFactor,
        });
      }
    });
  }

  private applyWaveTurbulence(): void {
    if (!this.raftBody) return;

    const waveHeight = this.weatherEffects.waveHeight;
    if (waveHeight <= 0.05) return;

    const turbulenceStrength = waveHeight * 0.02;
    const wavePhaseX = Math.sin(this.time * 2.5 + this.raftBody.position.x * 0.5);
    const wavePhaseY = Math.cos(this.time * 3 + this.raftBody.position.x * 0.3);

    const turbulenceForceX = wavePhaseX * turbulenceStrength;
    const turbulenceForceY = wavePhaseY * turbulenceStrength * 0.5;

    const leftPoint = { x: this.raftBody.position.x - 0.5, y: this.raftBody.position.y };
    const rightPoint = { x: this.raftBody.position.x + 0.5, y: this.raftBody.position.y };

    Body.applyForce(this.raftBody, leftPoint, {
      x: turbulenceForceX * 0.5,
      y: turbulenceForceY + Math.sin(this.time * 4) * turbulenceStrength * 0.3,
    });
    Body.applyForce(this.raftBody, rightPoint, {
      x: turbulenceForceX * 0.5,
      y: -turbulenceForceY + Math.cos(this.time * 4 + 1) * turbulenceStrength * 0.3,
    });

    this.cargoBodies.forEach((cargoBody) => {
      const cargoTurbulence = turbulenceStrength * 0.4;
      Body.applyForce(cargoBody, cargoBody.position, {
        x: Math.sin(this.time * 3 + cargoBody.position.x) * cargoTurbulence,
        y: Math.cos(this.time * 2.5 + cargoBody.position.y) * cargoTurbulence * 0.3,
      });
    });
  }

  private updateWaterLevel(): void {
    const waveHeight = this.weatherEffects.waveHeight;
    const baseWave = Math.sin(this.time * 0.5) * Math.max(0.05, waveHeight);
    const smallRipple = Math.sin(this.time * 2) * Math.max(0.02, waveHeight * 0.4);
    const highFreqWave = Math.sin(this.time * 4) * Math.max(0.01, waveHeight * 0.2);
    this.waterLevel = baseWave + smallRipple + highFreqWave;
  }

  private calculateDynamicDraftDepth(): number {
    if (!this.raftBody) return 0;

    const dims = calculateRaftDimensions(this.config);
    const raftBottomY = this.raftBody.position.y + dims.height / 2;
    const draftDepth = Math.max(0, raftBottomY - this.waterLevel);
    return draftDepth;
  }

  private checkCargoSlipping(cargoBody: Matter.Body): { isSlipping: boolean; slipDirection: 'left' | 'right' | null } {
    const velocity = cargoBody.velocity;
    const speed = Vector.magnitude(velocity);
    const slipThreshold = 0.1;

    if (speed > slipThreshold) {
      const angle = Math.atan2(velocity.y, velocity.x);
      const isHorizontal = Math.abs(Math.cos(angle)) > 0.5;
      if (isHorizontal) {
        return {
          isSlipping: true,
          slipDirection: velocity.x > 0 ? 'right' : 'left',
        };
      }
    }

    return { isSlipping: false, slipDirection: null };
  }

  public update(deltaTime: number): void {
    if (!this.isRunning || this.isPaused) return;

    this.time += deltaTime;
    this.updateWaterLevel();
    this.calculateBuoyancy();
    this.applyWaterDrag();
    this.applyWaterFlow();

    Engine.update(this.engine, deltaTime * 1000);
  }

  public start(): void {
    if (this.isRunning && !this.isPaused) return;
    this.isRunning = true;
    this.isPaused = false;
    this.time = 0;
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.reset();
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
  }

  public reset(): void {
    if (this.raftBody) {
      Body.setPosition(this.raftBody, { x: 0, y: this.raftInitialY });
      Body.setVelocity(this.raftBody, { x: 0, y: 0 });
      Body.setAngularVelocity(this.raftBody, 0);
      Body.setAngle(this.raftBody, 0);
    }

    this.cargoBodies.forEach((body, id) => {
      const cargo = this.cargos.find((c) => c.id === id);
      if (cargo) {
        Body.setPosition(body, { x: cargo.x, y: cargo.y });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Body.setAngle(body, 0);
      }
    });

    this.time = 0;
    this.waterLevel = 0;
  }

  public getState(): PhysicsState {
    if (!this.raftBody) {
      return {
        isRunning: this.isRunning,
        raftAngle: 0,
        raftAngularVelocity: 0,
        raftVelocityX: 0,
        raftVelocityY: 0,
        waterLevel: this.waterLevel,
        dynamicDraftDepth: 0,
        cargosPhysics: [],
      };
    }

    const cargosPhysics: CargoPhysicsState[] = this.cargos.map((cargo) => {
      const body = this.cargoBodies.get(cargo.id);
      if (!body) {
        return {
          cargoId: cargo.id,
          x: cargo.x,
          y: cargo.y,
          angle: 0,
          velocityX: 0,
          velocityY: 0,
          angularVelocity: 0,
          isSlipping: false,
          slipDirection: null,
        };
      }

      const slipState = this.checkCargoSlipping(body);
      return {
        cargoId: cargo.id,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
        velocityX: body.velocity.x,
        velocityY: body.velocity.y,
        angularVelocity: body.angularVelocity,
        isSlipping: slipState.isSlipping,
        slipDirection: slipState.slipDirection,
      };
    });

    return {
      isRunning: this.isRunning,
      raftAngle: this.raftBody.angle,
      raftAngularVelocity: this.raftBody.angularVelocity,
      raftVelocityX: this.raftBody.velocity.x,
      raftVelocityY: this.raftBody.velocity.y,
      waterLevel: this.waterLevel,
      dynamicDraftDepth: this.calculateDynamicDraftDepth(),
      cargosPhysics,
    };
  }

  public addCargo(cargo: Cargo): void {
    if (this.cargoBodies.has(cargo.id)) return;

    const body = this.createCargoBody(cargo);
    this.cargoBodies.set(cargo.id, body);
    this.cargos.push(cargo);
    World.add(this.world, body);
  }

  public removeCargo(cargoId: string): void {
    const body = this.cargoBodies.get(cargoId);
    if (body) {
      World.remove(this.world, body);
      this.cargoBodies.delete(cargoId);
      this.cargos = this.cargos.filter((c) => c.id !== cargoId);
    }
  }

  public updateCargo(cargoId: string, updates: Partial<Cargo>): void {
    const cargoIndex = this.cargos.findIndex((c) => c.id === cargoId);
    if (cargoIndex === -1) return;

    const currentCargo = this.cargos[cargoIndex];
    const updatedCargo = { ...currentCargo, ...updates };
    this.cargos[cargoIndex] = updatedCargo;

    const body = this.cargoBodies.get(cargoId);
    if (body) {
      if (updates.x !== undefined || updates.y !== undefined) {
        Body.setPosition(body, {
          x: updates.x ?? currentCargo.x,
          y: updates.y ?? currentCargo.y,
        });
      }
      if (updates.width !== undefined || updates.height !== undefined) {
        const newDensity = updatedCargo.weight / (updatedCargo.width * updatedCargo.height);
        Body.setDensity(body, newDensity);
      }
      if (updates.weight !== undefined) {
        const newDensity = updatedCargo.weight / (updatedCargo.width * updatedCargo.height);
        Body.setDensity(body, newDensity);
      }
    }
  }

  public updateConfig(config: Partial<RaftConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateWeatherEffects();
    this.createRaft();

    this.cargos.forEach((cargo) => {
      const body = this.cargoBodies.get(cargo.id);
      if (body) {
        Body.setPosition(body, { x: cargo.x, y: cargo.y });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Body.setAngle(body, 0);
      }
    });
  }

  public getWeatherEffects(): WeatherWaterEffects {
    return { ...this.weatherEffects };
  }

  public getRaftBody(): Matter.Body | null {
    return this.raftBody;
  }

  public getCargoBody(cargoId: string): Matter.Body | undefined {
    return this.cargoBodies.get(cargoId);
  }

  public getAllCargoBodies(): Map<string, Matter.Body> {
    return new Map(this.cargoBodies);
  }

  public getTubeBodies(): Matter.Body[] {
    return [...this.tubeBodies];
  }

  public getCurrentConfig(): RaftConfig {
    return { ...this.config };
  }

  public getCurrentCargos(): Cargo[] {
    return [...this.cargos];
  }

  public destroy(): void {
    Events.off(this.engine, 'afterUpdate', null as unknown as () => void);
    World.clear(this.world, false);
    Engine.clear(this.engine);
    this.raftBody = null;
    this.cargoBodies.clear();
    this.tubeBodies = [];
    this.cargos = [];
    this.isRunning = false;
    this.isPaused = false;
  }
}
