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
    console.log("called fieldDecoratorImpl")
    const className = target.constructor.name;
    if (!Component.ComponentFieldMap[className]) {
        Component.ComponentFieldMap[className] = new Map();
    }
    Component.ComponentFieldMap[className].set(propertyKey, {
        fieldName: propertyKey
    });
};

export function field(originalMethod: any, context: ClassAccessorDecoratorContext) {
    console.log("originalMethod", originalMethod);
    console.log("n", context);
    context.addInitializer(function () {   
        fieldDecoratorImpl(this as Component, context.name as string)
    });
}

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

export function children<T>(value: {
    get: () => T;
    set: (value: T) => void;
  }, context: ClassAccessorDecoratorContext) {
    const propertyKey = context.name as string;

    return {
        get() {
            return (this as any)['__' + propertyKey];
        },
  
        set(val: any) {
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
    
            const extendedSet = new ExtendedSet(val);
    
            (this as any)['__' + propertyKey] = extendedSet;
        },
  
        init(initialValue: any) {
          console.log(`initializing ${propertyKey} with value ${initialValue}`);
          return initialValue;
        }
      };
}

export function parent<
V extends { new (): Component & Record<U, Set<Entity>> },
U extends string>
(parentComponentClass: V, aggregatePropertyKey: U) {
    function replacementMethod(originalMethod: any, context: ClassAccessorDecoratorContext) {
        const propertyKey = context.name as string;
        return {
            get() {
                return (this as any)['__' + propertyKey];
            },
      
            set(this: any, parent: Entity) {
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

                console.log("parent", parent);
                console.log("should be adding cleanup callback")
    
                // cleans up this reference if component is removed
                parent.addCleanupCallback(() => {
                    console.log("calling cleanup callback")
                    const entity = thisEntity;
                    console.log("entity.has parent", entity.has(parentComponentClass))
                    if (entity.has(this)) {
                        // entity property has been removed from component, we remove the component
                        entity.removeComponentByName(this.constructor.name);
                    }
                });
            },
      
            init(initialValue: any) {
              return initialValue;
            }
          };
    }

    return replacementMethod;
}
