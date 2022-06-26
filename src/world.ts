import { System } from './system';
import { Entity, EntityBuilder } from './entity';
import { ParentHasAspect } from './aspect';

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
    private aspectRegistry: Map<ComponentName, System[]> = new Map();
    private parentAspectRegistry: Map<ComponentName, System[]> = new Map();

    static create(): WorldBuilder {
        return new WorldBuilder();
    }

    addToAspectRegistry(
        key: ComponentName,
        system: System,
        registry: Map<ComponentName, System[]>
    ): void {
        if (!registry.has(key)) {
            registry.set(key, [system]);
        } else {
            registry.get(key)?.push(system);
        }
    }

    mapAspects(system: System): void {
        system.aspects().forEach((a) => {
            if (a instanceof ParentHasAspect) {
                this.addToAspectRegistry(
                    a.componentName,
                    system,
                    this.parentAspectRegistry
                );
            } else {
                this.addToAspectRegistry(
                    a.componentName,
                    system,
                    this.aspectRegistry
                );
            }
        });
    }

    addSystem(system: System): void {
        this.mapAspects(system);
        this.systems.push(system);
    }

    run = (delta = 1): void => {
        this.systems.forEach((system: System) => {
            system.run(delta);
        });
    };

    checkIncludeMask = (entity: Entity, s: System): boolean =>
        s.getIncludeMask() !== 0 &&
        checkMask(s.getIncludeMask(), entity.getComponentMask());

    checkExcludeMask = (entity: Entity, s: System): boolean =>
        checkMask(entity.getComponentMask(), s.getExcludeMask());

    checkParentMask = (entity: Entity, s: System): boolean =>
        s.getParentIncludeMask() !== 0 &&
        checkMask(s.getParentIncludeMask(), entity.getComponentMask());

    updateRegistry(componentName: string, entity: Entity): void {
        /**
         * TODO:
         * This actually has the potential to iterate through the same system multiple times
         * It should be possible to narrow it down so that we only check each system once?
         */
        this.aspectRegistry.get(componentName)?.forEach((system) => {
            const doesInclude = this.checkIncludeMask(entity, system);
            const doesntExclude = this.checkExcludeMask(entity, system);

            const registerThisEntity = doesInclude && doesntExclude;

            if (system.hasEntity(entity) && !registerThisEntity) {
                system.unregisterEntity(entity);
            } else if (registerThisEntity) {
                system.registerEntity(entity);
            }
        });
    }

    updateParentRegistry(componentName: string, entity: Entity): void {
        /**
         * TODO:
         * This actually has the potential to iterate through the same system multiple times
         * It should be possible to narrow it down so that we only check each system once?
         */
        this.parentAspectRegistry.get(componentName)?.forEach((system) => {
            const doesParentInclude = this.checkParentMask(entity, system);
            if (doesParentInclude) {
                entity.getChildren().forEach((c) => {
                    system.registerEntity(c);
                });
            } else {
                entity.getChildren().forEach((c) => {
                    system.unregisterEntity(c);
                });
            }
        });
    }

    spawnEntity(name?: string): EntityBuilder {
        return EntityBuilder.create(this, name);
    }

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

/**
 *
 * @param mask1 The mask that needs to be met to fulfill the condition
 * @param mask2 The other mask that needs to match up with the first mask
 * @returns Whether the masks match or not
 */
const checkMask = (mask1: number, mask2: number): boolean => {
    return (mask1 & mask2) == mask1;
};
