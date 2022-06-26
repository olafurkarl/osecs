import { ComponentMaskMap } from './component';
import { Entity } from './entity';
import { World } from './world';

export abstract class System {
    private entityIds = new Set<string>();
    protected entities: Entity[] = [];

    public world: World;

    constructor(world: World) {
        this.world = world;
    }

    hasEntity(entity: Entity): boolean {
        return this.entityIds.has(entity.id);
    }

    registerEntity(entity: Entity): void {
        if (!this.hasEntity(entity)) {
            this.entities.push(entity);
            this.entityIds.add(entity.id);
        }
    }

    unregisterEntity(entity: Entity): void {
        this.entities = this.entities.filter((e) => e.id !== entity.id);
        this.entityIds.delete(entity.id);
    }

    abstract run(delta: number): void;

    abstract aspects(): unknown[];
    abstract excludes(): unknown[];

    private aspectMask: number | undefined;
    private excludeMask: number | undefined;

    hasAspect(aspect: string): boolean {
        return this.hasComponent(aspect, this.aspects());
    }

    hasExclude(exclude: string): boolean {
        return this.hasComponent(exclude, this.excludes());
    }

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
