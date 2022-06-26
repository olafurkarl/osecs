import { EventEmitter } from 'events';
import { System } from './system';
import { Entity } from './entity';

interface EntityCleanupRecord {
    entity: Entity;
    componentName: string;
    onRemove: () => void;
}

class WorldBuilder {
    private world: World;

    constructor() {
        this.world = new World();
    }

    static create(): WorldBuilder {
        return new WorldBuilder();
    }

    withSystem<T extends { new (...args: any): any }>(systemClass: T) {
        this.world.addSystem(new systemClass(this.world));
        return this;
    }

    withSystems<T extends { new (...args: never): any }>(
        systemClasses: T[]
    ): WorldBuilder {
        systemClasses.forEach((s) => {
            this.withSystem(s);
        });
        return this;
    }

    build(): World {
        return this.world;
    }
}

type ComponentName = string;

export class World {
    private systems: System[] = [];
    private systemComponentMap: Map<ComponentName, System[]> = new Map();

    static create(): WorldBuilder {
        return new WorldBuilder();
    }

    validateSystem(system: System): void {
        system.aspects().forEach((e) => {
            if (
                system
                    .excludes()
                    .map((f) => (f as any).name)
                    .includes((e as any).name)
            ) {
                throw new Error(
                    'System aspects must not contains any of its excludes'
                );
            }
        });
    }

    addToSCMap(key: ComponentName, system: System): void {
        if (!this.systemComponentMap.has(key)) {
            this.systemComponentMap.set(key, [system]);
        } else {
            this.systemComponentMap.get(key)?.push(system);
        }
    }

    mapAspectsAndExcludes(system: System): void {
        system.aspects().forEach((a) => {
            this.addToSCMap(a.name, system);
        });
        system.excludes().forEach((e) => {
            this.addToSCMap(e.name, system);
        });
    }

    addSystem(system: System): void {
        this.validateSystem(system);
        this.mapAspectsAndExcludes(system);
        this.systems.push(system);
    }

    run = (delta: number): void => {
        this.systems.forEach((system: System) => {
            system.run(delta);
        });
    };

    destroy(entity: Entity): void {
        entity.destroy();
    }

    checkAddOrRemove = (entity: Entity, s: System): boolean =>
        checkMask(entity.getComponentMask(), s.getExcludeMask()) &&
        checkMask(s.getAspectMask(), entity.getComponentMask());

    updateRegistry(componentName: string, entity: Entity): void {
        this.systemComponentMap.get(componentName)?.forEach((system) => {
            const addOrRemove = this.checkAddOrRemove(entity, system);
            if (system.hasEntity(entity) && !addOrRemove) {
                system.unregisterEntity(entity);
            } else if (addOrRemove) {
                system.registerEntity(entity);
            }
        });
    }

    syncRemoved = (
        system: System,
        { entity, componentName, onRemove }: EntityCleanupRecord
    ): void => {
        onRemove();
        if (
            !checkMask(system.getAspectMask(), entity.getComponentMask()) &&
            system.hasEntity(entity) &&
            system.hasAspect(componentName)
        ) {
            system.unregisterEntity(entity);
        }
    };

    /**
     * Used for testing
     */
    getSystem<T extends { new (...args: never): System }>(
        componentClass: T
    ): InstanceType<T> {
        return this.systems.filter(
            (s) => s.constructor.name === componentClass.name
        )[0] as InstanceType<T>;
    }
}

export const SystemEvents = new EventEmitter();

/**
 *
 * @param mask1 The mask that needs to be met to fulfill the condition
 * @param mask2 The other mask that needs to match up with the first mask
 * @returns Whether the masks match or not
 */
const checkMask = (mask1: number, mask2: number): boolean => {
    return (mask1 & mask2) == mask1;
};
