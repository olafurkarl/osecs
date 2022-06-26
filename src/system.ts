import { Entity } from './index';
import { World } from './world';
import { v4 as uuidv4 } from 'uuid';
import { Aspect, HasAspect, ParentHasAspect, WithoutAspect } from './aspect';

export type SystemId = string;
export abstract class System {
    public id: SystemId;
    public world: World;

    protected entities: Map<string, Entity>;

    constructor(world: World) {
        this.id = uuidv4();
        this.world = world;
        this.entities = new Map<string, Entity>();
        this.initializeMasks();
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

    abstract aspects(): Aspect[];

    private includeMask = 0;
    private excludeMask = 0;
    private parentInclude = 0;

    getExcludeMask(): number {
        return this.excludeMask;
    }

    getIncludeMask(): number {
        return this.includeMask;
    }

    getParentIncludeMask(): number {
        return this.parentInclude;
    }

    initializeMasks(): void {
        let includeMask = 0,
            excludeMask = 0,
            parentIncludeMask = 0;

        this.aspects().forEach((aspect) => {
            switch (aspect.constructor) {
                case HasAspect: {
                    includeMask |= aspect.mask;
                    break;
                }
                case WithoutAspect: {
                    excludeMask |= aspect.mask;
                    break;
                }
                case ParentHasAspect: {
                    parentIncludeMask |= aspect.mask;
                    break;
                }
            }
        });

        this.includeMask = includeMask;
        this.excludeMask = ~excludeMask >>> 0;
        this.parentInclude = parentIncludeMask;
    }
}
