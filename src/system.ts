import Entity from './entity';
import events from './events';

export default abstract class System {
    private entityIds = new Set<string>();
    protected entities: Entity[] = [];

    hasEntity(entity: Entity): boolean {
        return this.entityIds.has(entity.id);
    }

    registerEntity(entity: Entity): void {
        if (!this.hasEntity(entity)) {
            this.entities.push(entity);
            this.entityIds.add(entity.id);
            entity.once(events.ENT_DESTROYED, (entity: Entity) => {
                this.unregisterEntity(entity);
            });
        }
    }

    unregisterEntity(entity: Entity): void {
        this.entities = this.entities.filter((e) => e.id !== entity.id);
        this.entityIds.delete(entity.id);
    }

    abstract run(delta: number): void;

    abstract aspects(): unknown[];

    private aspectMask: number | undefined;

    hasAspect(aspect: string): boolean {
        return this.aspects()
            .map((a: any) => a.name)
            .includes(aspect);
    }

    getAspectMask(): number {
        if (!this.aspectMask) {
            this.aspectMask = this.aspects()
                .map((a: any) => a.prototype.getMask())
                .reduce((prev, curr) => prev | curr, 0);
        }
        return this.aspectMask as number;
    }
}
