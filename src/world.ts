import { System } from './system';
import { Entity, EntityBuilder } from './entity';
import { ParentHasAspect } from './aspect';
import { Query } from './query';

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
    private queryRegistry: Map<ComponentName, Query[]> = new Map();
    private parentQueryRegistry: Map<ComponentName, Query[]> = new Map();

    static create(): WorldBuilder {
        return new WorldBuilder();
    }

    /**
     * Keeping track of which queries are interested in which components,
     * in order to reduce the amount of iterations when updating entity lists
     */
    addToAspectRegistry(
        key: ComponentName,
        query: Query,
        registry: Map<ComponentName, Query[]>
    ): void {
        if (!registry.has(key)) {
            registry.set(key, [query]);
        } else {
            registry.get(key)?.push(query);
        }
    }

    mapAspects(system: System): void {
        system.queries.forEach((query: Query) => {
            const aspects = query.aspects;
            aspects.forEach((a) => {
                if (a instanceof ParentHasAspect) {
                    this.addToAspectRegistry(
                        a.componentName,
                        query,
                        this.parentQueryRegistry
                    );
                } else {
                    this.addToAspectRegistry(
                        a.componentName,
                        query,
                        this.queryRegistry
                    );
                }
            });
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

    updateRegistry(componentName: string, entity: Entity): void {
        /**
         * TODO:
         * This actually has the potential to iterate through the same query multiple times
         * It should be possible to narrow it down so that we only check each query once?
         */
        this.queryRegistry.get(componentName)?.forEach((query) => {
            const registerThisEntity = query.shouldRegisterEntity(entity);

            if (query.hasEntity(entity) && !registerThisEntity) {
                query.unregisterEntity(entity);
            } else if (registerThisEntity) {
                query.registerEntity(entity);
            }
        });
    }

    updateParentRegistry(
        componentName: string,
        parentEnt: Entity,
        childEnt: Entity
    ): void {
        /**
         * TODO:
         * This actually has the potential to iterate through the same query multiple times
         * It should be possible to narrow it down so that we only check each query once?
         */
        this.parentQueryRegistry.get(componentName)?.forEach((query) => {
            const registerThisEntity = query.shouldRegisterEntity(childEnt);
            if (registerThisEntity) {
                query.registerEntity(childEnt);
            } else {
                query.unregisterEntity(childEnt);
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
