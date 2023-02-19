/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from './entity';

export type ComponentId = number;
export type ComponentName = string;
export type ComponentField = {
    fieldName: string;
    defaultValue: any;
};
/**
 * Component that can be attached to entities.
 */
export abstract class Component {
    // Map to get component prototype id by component name
    static ComponentIdMap: Record<ComponentName, ComponentId> = {};

    // Map to keep a record of all fields registered with decorators
    static ComponentFieldMap: Record<ComponentName, Array<ComponentField>> = {};

    // Higher current component prototype id
    static maxId = 0;

    // Prototype id for this component class, set in decorator.
    declare componentId: ComponentId;

    // Entity that this component is attached to
    private declare entity: Entity;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types
    setValues(values: Record<string, any>): void {
        const fields = Component.ComponentFieldMap[this.constructor.name];

        fields.forEach(({ fieldName, defaultValue }) => {
            if (typeof values[fieldName] === 'undefined') {
                if (typeof defaultValue !== 'undefined') {
                    (this as any)[fieldName] = defaultValue;
                } else {
                    throw new Error(
                        `Value not provided for ${fieldName} on component ${this.constructor.name}.`
                    );
                }
            } else {
                (this as any)[fieldName] = values[fieldName];
            }
        });
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

export type ComponentArgs<C> = {
    // Get all members of template component type, but exclude all parent properties.
    [Property in Exclude<keyof C, keyof Component>]: C[Property];
};
export type ComponentConstructor = { new (...args: any[]): Component };

export function RegisterComponent<T extends ComponentConstructor>(
    constructor: T
): any {
    Component.maxId++;
    const newComponentId = Component.maxId;
    constructor.prototype.componentId = newComponentId;

    Component.ComponentIdMap[constructor.name] = newComponentId;
}
