/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from './entity';

export type ComponentId = number;
export type ComponentName = string;
/**
 * Component that can be attached to entities.
 */
export abstract class Component {
    // Map to get component prototype id by component name
    static ComponentIdMap: Record<ComponentName, ComponentId> = {};

    // Higher current component prototype id
    static maxId = 0;

    // Prototype id for this component class, set in decorator.
    declare componentId: ComponentId;

    // Entity that this component is attached to
    private declare entity: Entity;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types
    setValues(values?: Object): void {
        // nothing implemented for init by default
        return;
    }
    setEntity(entity: Entity): void {
        this.entity = entity;
    }

    getEntity(): Entity {
        if (!this.entity) {
            throw new Error(
                "Component tried to fetch it's entity, but none was found"
            );
        }
        return this.entity;
    }

    onComponentRemoved() {
        // no-op
    }

    toString(): string {
        return `${this.constructor.name}`;
    }
}

export function RegisterComponent<
    T extends { new (...args: any[]): Component }
>(constructor: T): any {
    Component.maxId++;
    const newComponentId = Component.maxId;
    constructor.prototype.componentId = newComponentId;

    Component.ComponentIdMap[constructor.name] = newComponentId;
}
