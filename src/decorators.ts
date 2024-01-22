/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, Entity } from '.';

type ComponentDecorator = (target: Component, propertyKey: string) => void;

/**
 * Register field
 */
const fieldDecoratorImpl: ComponentDecorator = (
    target: Component,
    propertyKey: string
) => {
    const className = target.constructor.name;
    if (!Component.ComponentFieldMap[className]) {
        Component.ComponentFieldMap[className] = new Map();
    }
    Component.ComponentFieldMap[className].set(propertyKey, {
        fieldName: propertyKey
    });
};

export function field(target: Component, propertyKey: string) {
    fieldDecoratorImpl(target, propertyKey);
}

export const validate = <T>(
    validateFunction: (val: T) => boolean
): PropertyDecorator & MethodDecorator => {
    return function validateImpl(
        target: any,
        propertyKey: PropertyKey,
        descriptor?: PropertyDescriptor
    ) {
        const prevSet = descriptor?.set;
        const setter = function (this: T) {
            if (validateFunction(this)) {
                prevSet?.(this);
            } else {
                throw new Error('Component failed validation function.');
            }
        };

        Object.defineProperty(target, propertyKey, {
            set: setter
        });
    };
};

/**
 * Initialize field as another field on startup.
 * Useful for patterns where you have a field that derives from another.
 * (Example: A 'current' hp value might be initialized from a 'max' hp value.
 * @param initAsField
 */
export function initializeAs(initAsField: string) {
    return function (target: Component, propertyKey: any) {
        const className = target.constructor.name;
        if (!Component.ComponentFieldInitializeMap[className]) {
            Component.ComponentFieldInitializeMap[className] = new Map();
        }

        if (
            !Component.ComponentFieldInitializeMap[className].has(initAsField)
        ) {
            !Component.ComponentFieldInitializeMap[className].set(
                initAsField,
                []
            );
        }
        Component.ComponentFieldInitializeMap[className]
            .get(initAsField)
            ?.push(propertyKey);
    };
}

export function init<C>(
    initValue: C
): <T extends Component, K extends keyof T>(
    target: T,
    propertyKey: T[K] extends C ? K : never
) => void {
    return function (target: Component, propertyKey: any) {
        return initImpl(target, propertyKey, initValue);
    };
}

const initImpl = (
    target: Component,
    propertyKey: string,
    defaultValue: unknown
) => {
    const className = target.constructor.name;
    if (!Component.ComponentFieldMap[className]) {
        Component.ComponentFieldMap[className] = new Map();
    }
    Component.ComponentFieldMap[className].set(propertyKey, {
        fieldName: propertyKey,
        defaultValue
    });
};

export function children<
    T extends Component & Record<K, Set<Entity>>,
    K extends string
>(component: T, propertyKey: K) {
    const getter = function (this: Component) {
        return (this as any)['__' + propertyKey];
    };

    const setter = function (this: Component, children: Set<Entity>) {
        const addCleanupCallback = (entity: Entity) => {
            entity.addCleanupCallback(() => {
                extendedSet.delete(entity);
            });
        };
        class ExtendedSet extends Set<Entity> {
            public add(value: Entity) {
                super.add(value);
                addCleanupCallback(value);
                return this;
            }

            // todo, clean up existing cleanup callback
        }

        const extendedSet = new ExtendedSet(children);

        (this as any)['__' + propertyKey] = extendedSet;
    };

    Object.defineProperty(component, propertyKey, {
        get: getter,
        set: setter
    });
}

/**
 * Mark entity property as parent
 * @param parentComponentClass Component which will get updated refs to any child entity
 * @param aggregatePropertyKey Property name of array which will contain all child refs
 * @returns Decorator
 */
export function parent<
    V extends { new (): Component & Record<U, Set<Entity>> },
    U extends string
>(parentComponentClass: V, aggregatePropertyKey: U) {
    return <T extends Component & Record<K, Entity>, K extends string>(
        component: T,
        propertyKey: K
    ) => {
        const getter = function (this: T) {
            return (this as any)['__' + propertyKey];
        };
        const setter = function (this: T, parent: Entity) {
            const thisEntity = this.getEntity();

            // has old parent?
            if (thisEntity.has(this)) {
                const oldParent = thisEntity.get(this)[propertyKey] as Entity;
                if (oldParent.has(parentComponentClass)) {
                    const oldParentAggregateProp =
                        oldParent.get(parentComponentClass)[
                            aggregatePropertyKey
                        ];
                    oldParentAggregateProp.delete(thisEntity);
                    if (oldParentAggregateProp.size === 0) {
                        oldParent.remove(parentComponentClass);
                    }
                }
            }

            (this as any)['__' + propertyKey] = parent;

            // Adding entity reference to parent component class
            if (!parent.has(parentComponentClass)) {
                const childrenSet = new Set<Entity>();
                childrenSet.add(thisEntity);
                parent.addComponent(parentComponentClass, {
                    [aggregatePropertyKey]: childrenSet
                } as any);
            } else {
                const childrenSet = parent.get(parentComponentClass)[
                    aggregatePropertyKey
                ] as Set<Entity> | undefined;

                if (!childrenSet) {
                    const newChildrenSet = new Set<Entity>();
                    newChildrenSet.add(thisEntity);

                    (parent.get(parentComponentClass)[
                        aggregatePropertyKey
                    ] as Set<Entity>) = newChildrenSet;
                } else {
                    childrenSet.add(thisEntity);
                }
            }

            // cleans up this reference if component is removed
            parent.addCleanupCallback(() => {
                const entity = thisEntity;
                if (entity.has(component)) {
                    // entity property has been removed from component, we remove the component
                    entity.removeComponentByName(component.constructor.name);
                }
            });
        };
        Object.defineProperty(component, propertyKey, {
            get: getter,
            set: setter
        });
    };
}
