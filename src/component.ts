/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from './entity';

export type ComponentId = number;
export type ComponentName = string;
export type ComponentField = {
    fieldName: string;
    defaultValue?: unknown;
};
/**
 * Component that can be attached to entities.
 */
export abstract class Component {
    // Map to get component prototype id by component name
    static ComponentIdMap: Record<ComponentName, ComponentId> = {};

    // Map to keep a record of all fields registered with decorators
    static ComponentFieldMap: Record<
        ComponentName,
        Map<string, ComponentField>
    > = {};

    static ComponentFieldInitializeMap: Record<
        ComponentName,
        Map<string, Array<string>>
    > = {};

    // Higher current component prototype id
    static maxId = 0;

    // Prototype id for this component class, set in decorator.
    declare componentId: ComponentId;

    // Entity that this component is attached to
    private declare entity: Entity;

    setValues(values: Record<string, any>): void {
        const fields = Component.ComponentFieldMap[this.constructor.name];
        const initializers =
            Component.ComponentFieldInitializeMap[this.constructor.name];

        fields.forEach(({ fieldName }) => {
            if (typeof values[fieldName] === 'undefined') {
                throw new Error(
                    `Value not provided for ${fieldName} on component ${this.constructor.name}.`
                );
            } else {
                (this as any)[fieldName] = values[fieldName];

                /**
                 * Initialize fields marked with `initializeAs`
                 */
                if (initializers && initializers.has(fieldName)) {
                    initializers.get(fieldName)?.forEach((otherField) => {
                        (this as any)[otherField] = values[fieldName];
                    });
                }
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

type NonFunctionPropertyNames<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type ComponentArgs<C> = {
    // Get all members of template component type, but exclude all parent properties
    // as well as functions.
    [Property in Exclude<
        NonFunctionPropertyNames<C>,
        keyof Component
    >]: C[Property];
};
export type ComponentConstructor = { new (...args: any[]): Component };

export function RegisterComponent<T extends ComponentConstructor>(
    constructor: T
): any {
    Component.maxId++;
    const newComponentId = Component.maxId;
    constructor.prototype.componentId = newComponentId;

    Component.ComponentIdMap[constructor.name] = newComponentId;
    if (!Component.ComponentFieldMap[constructor.name]) {
        Component.ComponentFieldMap[constructor.name] = new Map();
    }
}
