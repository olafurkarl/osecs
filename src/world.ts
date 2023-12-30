import { System } from './system';
import { Entity, EntityBuilder, EntityId, EntityOpts } from './entity';
import { Query } from './query';

export type SystemAndProps<T extends { new (...args: unknown[]): System }> = {
    system: T;
    props: ConstructorParameters<T>;
};

class WorldBuilder {
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    /**
     * Add a system to the world.
     * @param systemClass Class of system being added to world
     * @param args Any constructor arguments that the system takes
     */
    withSystem<T extends { new (...args: any[]): System }>(
        systemClass: T,
        ...args: ConstructorParameters<T>
    ) {
        const systemInstance = new systemClass(...args);
        systemInstance.world = this.world;
        this.world.addSystem(systemInstance);

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
    private allQueries: Array<Query> = [];
    private entities: Map<EntityId, Entity> = new Map();
    private deadEntities: Array<Entity> = [];
    private entitiesToBePurged: Array<Entity> = [];
    private initialized = false;

    private onRunCallbacks: Array<() => void> = [];

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    static create(): WorldBuilder {
        return new WorldBuilder(new World());
    }

    destroy(): void {
        this.systems = [];
        this.queryRegistry.clear();
        this.allQueries = [];
        this.entities.clear();
        this.deadEntities = [];
        this.entitiesToBePurged = [];
        this.initialized = false;
    }

    public getEntityById(id: EntityId) {
        return this.entities.get(id);
    }

    /**
     * Keeping track of which queries are interested in which components,
     * in order to reduce the amount of iterations when updating entity lists
     */
    addToQueryRegistry(
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
                this.addToQueryRegistry(
                    a.componentName,
                    query,
                    this.queryRegistry
                );
            });
            this.allQueries.push(query);
        });
    }

    addSystem(system: System): void {
        this.mapAspects(system);
        this.systems.push(system);
    }

    /**
     * Adds a callback that is called on each world.run
     */
    onRun = (cb: () => void) => {
        this.onRunCallbacks.push(cb);
    }

    /**
     * Run all of the world's systems
     * @param delta Optional, defaults to 1
     */
    run = (delta = 1): void => {
        if (!this.initialized) {
            this.systems.forEach((system) => {
                system.initialize();
            });
            this.initialized = true;
        }

        /**
         * Flush every query so that they get fresh changesets to track
         */
        this.allQueries.forEach((query) => {
            query.flushQuery();
        });

        /**
         * Run each system
         */
        this.systems.forEach((system: System) => {
            system.run(delta);
        });

        this.processGraveyard();

        this.onRunCallbacks.forEach((cb) => cb());
    };

    mapEntity(entity: Entity) {
        this.entities.set(entity.id, entity);
    }

    updateRegistry(componentName: string, entity: Entity): void {
        /**
         * TODO:
         * This actually has the potential to iterate through the same query multiple times
         * It should be possible to narrow it down so that we only check each query once?
         */
        this.queryRegistry.get(componentName)?.forEach((query: Query) => {
            query.updateRegistry(entity);
        });
    }

    spawnEntity(opts?: EntityOpts): EntityBuilder {
        return EntityBuilder.create(this, opts);
    }

    processGraveyard() {
        this.entitiesToBePurged.forEach((entity) => {
            entity.purge();
        });
        this.entitiesToBePurged = this.deadEntities.slice();
        this.deadEntities.length = 0;
    }

    markDeadEntity(entity: Entity) {
        this.deadEntities.push(entity);
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
