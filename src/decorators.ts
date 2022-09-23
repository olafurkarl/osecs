import { Component, Entity } from '.';

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
/**
 * Mark entity property as parent
 * @param parentComponentClass Component which will get updated refs to any child entity
 * @param aggregatePropertyKey Property name of array which will contain all child refs
 * @returns Decorator
 */
export function parent(
    parentComponentClass: { new (): Component },
    aggregatePropertyKey: string
) {
    /**
     * @param target component class
     * @param propertyKey name of property
     */
    return function (target: Component, propertyKey: string) {
        const getter = function (this: Component) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (this as any)['__' + propertyKey];
        };
        const setter = function (this: Component, newValue: Entity) {
            // TODO if previous value held, should clean up old reference

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any)['__' + propertyKey] = newValue;

            // TODO remove entity refs if no longer applicable

            // Adding entity reference to parent component class
            if (!newValue.has(parentComponentClass)) {
                newValue.addComponent(parentComponentClass, {
                    [aggregatePropertyKey]: []
                });
            } else {
                (
                    (newValue.get(parentComponentClass) as never)[
                        aggregatePropertyKey
                    ] as Array<Entity>
                ).push(this.getEntity());
            }

            // cleans up this reference if component is removed
            newValue.addCleanupCallback(() => {
                const entity = this.getEntity();
                if (entity.has(target)) {
                    // entity property has been removed from component, we remove the component
                    entity.removeComponentByName(target.constructor.name);
                }
            });
        };
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter
        });
    };
}
