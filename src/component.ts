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
    /**
     * Bitflag id assigned to a component class at registration time.
     * Keyed by the class reference itself, not by class name, so the ECS
     * survives identifier mangling by minifiers and obfuscators.
     */
    static ComponentIdMap: Map<ComponentConstructor, ComponentId> = new Map();

    static ComponentFieldMap: Map<
        ComponentConstructor,
        Map<string, ComponentField>
    > = new Map();

    static ComponentFieldInitializeMap: Map<
        ComponentConstructor,
        Map<string, Array<string>>
    > = new Map();

    static maxId = 0;

    declare componentId: ComponentId;

    private declare entity: Entity;

    setValues(values: Record<string, any>): void {
        const ctor = this.constructor as ComponentConstructor;
        const fields = Component.ComponentFieldMap.get(ctor);
        const initializers = Component.ComponentFieldInitializeMap.get(ctor);

        if (!fields) {
            return;
        }

        fields.forEach(({ fieldName }) => {
            if (typeof values[fieldName] === 'undefined') {
                throw new Error(
                    `Value not provided for ${fieldName} on component ${this.constructor.name}.`
                );
            } else {
                (this as any)[fieldName] = values[fieldName];

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

    const fields = pendingFields.splice(0);
    const fieldMap = Component.ComponentFieldMap.get(value);
    if (fieldMap) {
        for (const f of fields) {
            fieldMap.set(f.fieldName, f);
        }
    }

    const initializers = pendingInitializers.splice(0);
    if (initializers.length > 0) {
        let initMap = Component.ComponentFieldInitializeMap.get(value);
        if (!initMap) {
            initMap = new Map();
            Component.ComponentFieldInitializeMap.set(value, initMap);
        }
        for (const init of initializers) {
            if (!initMap.has(init.initFrom)) {
                initMap.set(init.initFrom, []);
            }
            initMap.get(init.initFrom)?.push(init.field);
        }
    }
}

const registerComponent = (
    constructor: ComponentConstructor,
    newComponentId: number
) => {
    constructor.prototype.componentId = newComponentId;
    Component.ComponentIdMap.set(constructor, newComponentId);

    if (!Component.ComponentFieldMap.has(constructor)) {
        Component.ComponentFieldMap.set(constructor, new Map());
    }
};
