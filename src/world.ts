import { System } from './system';
import { Entity, EntityBuilder, EntityId } from './entity';
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
    private allQueries: Array<Query> = [];
    private entities: Map<EntityId, Entity> = new Map();
    private deadEntities: Array<Entity> = [];
    private entitiesToBePurged: Array<Entity> = [];

    static create(): WorldBuilder {
        return new WorldBuilder();
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

        this.allQueries.push(query);
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
        });
    }

    addSystem(system: System): void {
        this.mapAspects(system);
        this.systems.push(system);
    }

    run = (delta = 1): void => {
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

    spawnEntity(name?: string): EntityBuilder {
        return EntityBuilder.create(this, name);
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
