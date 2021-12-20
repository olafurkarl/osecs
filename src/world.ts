import { EventEmitter } from 'events';
import System from './system';
import Entity from './entity';

interface EntityCleanupRecord {
    entity: Entity;
    componentName: string;
    onRemove: () => void;
}

export class World {
    private systems: System[] = [];

    addSystem(system: System): void {
        this.systems.push(system);
    }

    addSystems(systems: System[]): void {
        systems.forEach((s) => {
            this.systems.push(s);
        });
    }

    run = (delta: number): void => {
        this.cleanup();

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

    cleanup(): void {
        this.dirtyAdded.forEach(this.syncAdded);
        this.dirtyAdded = [];
        this.dirtyRemoved.forEach(this.syncRemoved);
        this.dirtyRemoved.clear();
    }

    syncAdded = (entity: Entity): void => {
        this.systems
            .filter((s) =>
                checkMask(s.getAspectMask(), entity.getComponentMask())
            )
            .forEach((s) => {
                s.registerEntity(entity);
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
