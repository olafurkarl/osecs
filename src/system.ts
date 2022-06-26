import { Component, ComponentMaskMap } from './component';
import { Entity } from './entity';
import { World } from './world';
import { v4 as uuidv4 } from 'uuid';

export type SystemId = string;
export abstract class System {
    public id: SystemId;
    public world: World;

    protected entities: Map<string, Entity>;

    constructor(world: World) {
        this.id = uuidv4();
        this.world = world;
        this.entities = new Map<string, Entity>();
    }

    /**
     * Check whether an entity is currently being tracked by this system
     * @param entity Entity to check
     * @returns whether the entity is in the system's entity list
     */
    hasEntity(entity: Entity): boolean {
        return this.entities.has(entity.id);
    }

    /**
     * Adds an entity to this system's entity track list
     * @param entity Entity to add
     */
    registerEntity(entity: Entity): void {
        if (!this.hasEntity(entity)) {
            this.entities.set(entity.id, entity);
            entity.registerSystem(this);
        }
    }

    /**
     * Remove an entity from this system's entity track list
     * @param entity Entity to remove
     */
    unregisterEntity(entity: Entity): void {
        this.entities.delete(entity.id);
        entity.unregisterSystem(this);
    }

    abstract run(delta: number): void;

    abstract aspects(): typeof Component[];
    abstract excludes(): typeof Component[];

    private aspectMask: number | undefined;
    private excludeMask: number | undefined;

    /**
     * Checks whether the system has a particular component aspect
     * @param exclude of component's class
     * @returns boolean (has it or not)
     */
    hasAspect(aspect: string): boolean {
        return this.hasComponent(aspect, this.aspects());
    }

    /**
     * Checks whether the system has a particular component excluded
     * @param exclude of component's class
     * @returns boolean (has it or not)
     */
    hasExclude(exclude: string): boolean {
        return this.hasComponent(exclude, this.excludes());
    }

    /**
     * Checks whether the system has a particular component in either aspects or exclude lists
     * @param name of component's class
     * @param array of components (aspects or excludes)
     * @returns boolean (has it or not)
     */
    hasComponent(name: string, array: unknown[]): boolean {
        return array.map((a: any) => a.name).includes(name);
    }

    getAspectMask(): number {
        if (!this.aspectMask) {
            this.aspectMask = this.getMask(this.aspects());
        }
        return this.aspectMask as number;
    }

    getExcludeMask(): number {
        if (!this.excludeMask) {
            this.excludeMask = ~this.getMask(this.excludes()) >>> 0;
        }
        return this.excludeMask as number;
    }

    getMask(maskable: unknown[]): number {
        return maskable
            .map((a: any) => ComponentMaskMap[a.name])
            .reduce((prev, curr) => prev | curr, 0);
    }
}
