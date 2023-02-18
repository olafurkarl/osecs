import { Component, Entity } from '.';
import { ComponentConstructor } from './component';

// TODO write tests for this mess

type ComponentDecorator = (target: Component, propertyKey: string) => void;
type ComponentDecoratorOpts = { default: unknown };

/**
 * Register field
 */
const fieldDecoratorImpl = (
    target: Component,
    propertyKey: string,
    opts?: ComponentDecoratorOpts
) => {
    const className = target.constructor.name;
    if (!Component.ComponentFieldMap[className]) {
        Component.ComponentFieldMap[className] = [];
    }
    Component.ComponentFieldMap[className].push({
        fieldName: propertyKey,
        defaultValue: opts?.default
    });
};

const isClass = (instance: any): instance is Component => {
    return typeof instance.constructor !== 'undefined';
};

export function field(target: Component, propertyKey: string): void;
export function field(opts: ComponentDecoratorOpts): ComponentDecorator;
export function field(
    targetOrOpts: Component | ComponentDecoratorOpts,
    propertyKey?: string
): ComponentDecorator | undefined {
    if (isClass(targetOrOpts) && propertyKey) {
        fieldDecoratorImpl(targetOrOpts, propertyKey);
    } else {
        return function (target: Component, propertyKey: string) {
            fieldDecoratorImpl(
                target,
                propertyKey,
                targetOrOpts as ComponentDecoratorOpts
            );
        };
    }
}

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any)['__' + propertyKey] = parent;

            // Adding entity reference to parent component class
            if (!parent.has(parentComponentClass)) {
                const childrenSet = new Set<Entity>();
                childrenSet.add(thisEntity);
                parent.addComponent(parentComponentClass, {
                    [aggregatePropertyKey]: childrenSet
                });
            } else {
                const childrenSet = (parent.get(parentComponentClass) as never)[
                    aggregatePropertyKey
                ] as Set<Entity>;

                childrenSet.add(thisEntity);
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
