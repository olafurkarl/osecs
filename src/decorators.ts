import { Component, Entity } from '.';

// TODO write tests for this mess

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
