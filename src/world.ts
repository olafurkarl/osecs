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

    withSystem<T extends { new (...args: never): any }>(systemClass: T) {
        this.world.addSystem(new systemClass());
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

export class World {
    private systems: System[] = [];

    static create(): WorldBuilder {
        return new WorldBuilder();
    }

    addSystem(system: System): void {
        this.systems.push(system);
    }

    run = (delta: number): void => {
        this.sync();

        this.systems.forEach((system: System) => {
            system.run(delta);
        });
    };

    private dirtyAdded: Entity[] = [];
    private dirtyRemoved = new Map<string, EntityCleanupRecord>();

    onComponentAdded(entity: Entity): void {
        this.dirtyAdded.push(entity);
    }

    onComponentRemoved(record: EntityCleanupRecord): void {
        const key = this.getCleanupKey(record);
        if (!this.dirtyRemoved.has(key)) {
            this.dirtyRemoved.set(key, record);
        }
    }

    getCleanupKey(record: EntityCleanupRecord): string {
        return record.entity.id + record.componentName;
    }

    sync(): void {
        this.dirtyAdded.forEach(this.syncAdded);
        this.dirtyAdded = [];
        this.dirtyRemoved.forEach(this.syncRemoved);
        this.dirtyRemoved.clear();
    }

    checkAddOrRemove = (entity: Entity, s: System): boolean =>
        checkMask(entity.getComponentMask(), s.getExcludeMask()) &&
        checkMask(s.getAspectMask(), entity.getComponentMask());

    syncAdded = (entity: Entity): void => {
        this.systems.forEach((s) => {
            const addOrRemove = this.checkAddOrRemove(entity, s);
            if (s.hasEntity(entity) && !addOrRemove) {
                s.unregisterEntity(entity);
            } else if (addOrRemove) {
                s.registerEntity(entity);
            }
        });
    };

    syncRemoved = ({
        entity,
        componentName,
        onRemove
    }: EntityCleanupRecord): void => {
        onRemove();
        this.systems
            .filter(
                (s) =>
                    // Every system that doesn't match the flag, but still has the entity
                    !checkMask(s.getAspectMask(), entity.getComponentMask()) &&
                    s.hasEntity(entity) &&
                    s.hasAspect(componentName)
            )
            .forEach((s) => {
                s.unregisterEntity(entity);
            });
    };

    /**
     * Used for testing
     */
    getSystem<T extends { new (...args: never): System }>(
        componentClass: T
    ): T {
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
