/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity } from './entity';
import { pendingFields, pendingInitializers } from './decorators';

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

export const registerComponentWithSpecificId = <T extends ComponentConstructor>(
    constructor: T,
    id: number
) => {
    registerComponent(constructor, id);
};

export function RegisterComponent<T extends ComponentConstructor>(
    value: T,
    _context: ClassDecoratorContext
): void {
    Component.maxId++;
    const newComponentId = Component.maxId;
    registerComponent(value, newComponentId);

    // Process pending field registrations from member decorators
    const className = value.name;
    const fields = pendingFields.splice(0);
    for (const f of fields) {
        Component.ComponentFieldMap[className].set(f.fieldName, f);
    }

    // Process pending initializer mappings from @initializeAs
    const initializers = pendingInitializers.splice(0);
    if (initializers.length > 0) {
        if (!Component.ComponentFieldInitializeMap[className]) {
            Component.ComponentFieldInitializeMap[className] = new Map();
        }
        for (const init of initializers) {
            if (
                !Component.ComponentFieldInitializeMap[className].has(
                    init.initFrom
                )
            ) {
                Component.ComponentFieldInitializeMap[className].set(
                    init.initFrom,
                    []
                );
            }
            Component.ComponentFieldInitializeMap[className]
                .get(init.initFrom)
                ?.push(init.field);
        }
    }
}

const registerComponent = (constructor: any, newComponentId: number) => {
    constructor.prototype.componentId = newComponentId;
    Component.ComponentIdMap[constructor.name] = newComponentId;

    if (!Component.ComponentFieldMap[constructor.name]) {
        Component.ComponentFieldMap[constructor.name] = new Map();
    }
}