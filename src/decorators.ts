/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentField } from './component';
import { Entity } from './entity';

/**
 * Pending fields collected by member decorators, consumed by @RegisterComponent.
 * Safe because decorator evaluation is synchronous per class.
 */
export const pendingFields: ComponentField[] = [];
export const pendingInitializers: Array<{
    initFrom: string;
    field: string;
}> = [];

/**
 * Register field
 */
export function field(
    _value: undefined,
    context: ClassFieldDecoratorContext
): void {
    pendingFields.push({ fieldName: String(context.name) });
}

export const validate = <T>(
    validateFunction: (val: T) => boolean
) => {
    return function (
        value: ClassAccessorDecoratorTarget<Component, T>,
        context: ClassAccessorDecoratorContext<Component, T>
    ): ClassAccessorDecoratorResult<Component, T> {
        pendingFields.push({ fieldName: String(context.name) });
        return {
            set(this: Component, val: T) {
                if (validateFunction(val)) {
                    value.set.call(this, val);
                } else {
                    throw new Error('Component failed validation function.');
                }
            }
        };
    };
};

/**
 * Initialize field as another field on startup.
 * Useful for patterns where you have a field that derives from another.
 * (Example: A 'current' hp value might be initialized from a 'max' hp value.
 * @param initAsField
 */
export function initializeAs(initAsField: string) {
    return function (_value: undefined, context: ClassFieldDecoratorContext) {
        pendingInitializers.push({
            initFrom: initAsField,
            field: String(context.name)
        });
    };
}

export function init<C>(
    initValue: C
): (
    _value: undefined,
    context: ClassFieldDecoratorContext
) => (initialValue: C) => C {
    return function (
        _value: undefined,
        context: ClassFieldDecoratorContext
    ): (initialValue: C) => C {
        pendingFields.push({
            fieldName: String(context.name),
            defaultValue: initValue
        });
        return () => initValue;
    };
}

export function children(
    value: ClassAccessorDecoratorTarget<Component, Set<Entity>>,
    context: ClassAccessorDecoratorContext<Component, Set<Entity>>
): ClassAccessorDecoratorResult<Component, Set<Entity>> {
    pendingFields.push({ fieldName: String(context.name) });

    return {
        set(this: Component, childrenVal: Set<Entity>) {
            const addCleanupCallback = (entity: Entity) => {
                entity.addCleanupCallback(() => {
                    extendedSet.delete(entity);
                });
            };
            class ExtendedSet extends Set<Entity> {
                public add(val: Entity) {
                    super.add(val);
                    addCleanupCallback(val);
                    return this;
                }

                // todo, clean up existing cleanup callback
            }

            const extendedSet = new ExtendedSet(childrenVal);
            value.set.call(this, extendedSet as Set<Entity>);
        }
    };
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
    return (
        value: ClassAccessorDecoratorTarget<Component, Entity>,
        context: ClassAccessorDecoratorContext<Component, Entity>
    ): ClassAccessorDecoratorResult<Component, Entity> => {
        const propertyKey = String(context.name);
        pendingFields.push({ fieldName: propertyKey });

        return {
            set(this: Component, newParent: Entity) {
                const thisEntity = this.getEntity();

                // has old parent?
                const currentParent = value.get.call(this);
                if (currentParent) {
                    if (currentParent.has(parentComponentClass)) {
                        const oldParentAggregateProp =
                            currentParent.get(parentComponentClass)[
                                aggregatePropertyKey
                            ];
                        oldParentAggregateProp.delete(thisEntity);
                        if (oldParentAggregateProp.size === 0) {
                            currentParent.remove(parentComponentClass);
                        }
                    }
                }

                value.set.call(this, newParent);

                // Adding entity reference to parent component class
                if (!newParent.has(parentComponentClass)) {
                    const childrenSet = new Set<Entity>();
                    childrenSet.add(thisEntity);
                    newParent.addComponent(parentComponentClass, {
                        [aggregatePropertyKey]: childrenSet
                    } as any);
                } else {
                    const childrenSet = newParent.get(parentComponentClass)[
                        aggregatePropertyKey
                    ] as Set<Entity> | undefined;

                    if (!childrenSet) {
                        const newChildrenSet = new Set<Entity>();
                        newChildrenSet.add(thisEntity);

                        (newParent.get(parentComponentClass)[
                            aggregatePropertyKey
                        ] as Set<Entity>) = newChildrenSet;
                    } else {
                        childrenSet.add(thisEntity);
                    }
                }

                // cleans up this reference if component is removed
                const componentName = this.constructor.name;
                newParent.addCleanupCallback(() => {
                    if (thisEntity.has(this)) {
                        // entity property has been removed from component, we remove the component
                        thisEntity.removeComponentByName(componentName);
                    }
                });
            }
        };
    };
}
