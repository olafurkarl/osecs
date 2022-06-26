/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from './entity';
import { v4 as uuidv4 } from 'uuid';

export type ComponentId = number;
export type ComponentInstanceId = string;
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

    // Id for this component instance.
    private instanceId: ComponentInstanceId;

    constructor() {
        this.instanceId = uuidv4();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types
    setValues(values?: Object): void {
        // nothing implemented for init by default
        return;
    }

    getId(): ComponentInstanceId {
        return this.instanceId;
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

    public onComponentRemoved: () => void = () => {
        // no-op
    };
}

export function RegisterComponent<
    T extends { new (...args: any[]): Component }
>(constructor: T): any {
    Component.maxId++;
    const newComponentId = Component.maxId;
    constructor.prototype.componentId = newComponentId;

    Component.ComponentIdMap[constructor.name] = newComponentId;
}
