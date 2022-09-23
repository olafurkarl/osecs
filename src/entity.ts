/* eslint-disable @typescript-eslint/ban-types */
import { v4 as uuidv4 } from 'uuid';
import { Component, ComponentName } from './component';
import { Mask } from './mask';
import { Query, QueryId } from './query';
import { World } from './world';

export type EntityId = string;

/**
 * A base class from which all game entities derive, supports adding and removing {@link Component | Components}
 */
export class Entity {
    public id: EntityId;
    public name = 'unknown';

    private world: World;
    private _componentMask: Mask;
    private cleanupCallbacks: { (entity: Entity): void }[] = [];

    private components: Map<ComponentName, Component>;
    private currentQueries = new Map<QueryId, Query>();

    constructor(world: World, name?: string) {
        this.id = uuidv4().split('-')[0];
        this.components = new Map<ComponentName, Component>();
        this.world = world;
        this._componentMask = new Mask();
        if (name) {
            this.name = name;
        }
    }

    addComponent<T extends Component>(
        component: { new (): T },
        args?: ComponentArgs
    ): void {
        const componentInstance = new component();
        componentInstance.setEntity(this);
        if (Component.ComponentFieldMap[component.name]?.length > 0 && args) {
            componentInstance.setValues(args);
        }

        this.components.set(component.name, componentInstance);
        this._componentMask.flipOn(componentInstance.componentId - 1);

        this.world.updateRegistry(componentInstance.constructor.name, this);
    }

    /**
     * Alias for {@link upsertComponent}
     */
    upsert<T extends Component>(
        component: { new (): T },
        args?: ComponentArgs
    ): void {
        this.upsertComponent(component, args);
    }

    /**
     * Add or update a given component
     * @param component Component to update
     * @param args Values to set on component
     */
    upsertComponent<T extends Component>(
        component: { new (): T },
        args?: ComponentArgs
    ): void {
        if (!this.hasComponent(component)) {
            this.addComponent(component, args);
        } else {
            this.components
                .get(component.constructor.name)
                ?.setValues(args ?? {});
        }
    }

    /**
     * Alias for {@link getComponent}
     */
    get<T extends { new (...args: never): Component }>(
        componentClass: T
    ): InstanceType<T> {
        return this.getComponent(componentClass);
    }

    /**
     * Gets a component from the entity by class
     * @param componentClass Class of component to get
     * @returns Component instance
     */
    getComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): InstanceType<T> {
        return this.components.get(componentClass.name) as InstanceType<T>;
    }

    getComponentNames(): ComponentName[] {
        return Array.from(this.components.keys());
    }

    get componentMask(): Mask {
        return this._componentMask;
    }

    /**
     * Alias for {@link hasComponent}
     */
    has<T extends { new (...args: never): Component }>(
        componentClass: T | Component
    ): boolean {
        return this.hasComponent(componentClass);
    }

    /**
     * Check if an entity has a component.
     * @param componentClass Component class to check
     * @returns boolean true/false depending on whether the component is on the entity
     */
    hasComponent<T extends { new (...args: never): Component }>(
        componentClass: T | Component
    ): boolean {
        if (componentClass instanceof Component) {
            return this.components.has(componentClass.constructor.name);
        }
        return this.components.has(componentClass.name);
    }

    /**
     * Alias for {@link removeComponent}
     */
    remove<T extends { new (...args: never): Component }>(
        componentClass: T
    ): void {
        this.removeComponent(componentClass);
    }

    /**
     * Removes a component from entity by class
     * @param componentClass Component class to remove
     */
    removeComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): void {
        this.removeComponentByName(componentClass.name);
    }

    removeComponentByName(componentName: ComponentName): void {
        if (this.components.has(componentName)) {
            this._componentMask.flipOff(
                Component.ComponentIdMap[componentName] - 1
            );

            this.components.get(componentName)?.onComponentRemoved();
            this.components.delete(componentName);

            this.world.updateRegistry(componentName, this);
        } else {
            console.log(
                `${this.name} tried to remove ${componentName} but did not have it.`
            );
        }
    }

    /**
     * Check whether this entity is the same as passed entity
     */
    equals(other: Entity): boolean {
        return this.id === other.id;
    }

    registerQuery(query: Query): void {
        this.currentQueries.set(query.id, query);
    }

    unregisterQuery(query: Query): void {
        this.currentQueries.delete(query.id);
    }

    addCleanupCallback(callback: (entity: Entity) => void): void {
        this.cleanupCallbacks.push(callback);
    }

    destroy(): void {
        // use maintained list of registered systems and unregister entity
        this.currentQueries.forEach((q) => {
            q.unregisterEntity(this);
        });

        this.components.forEach((c) => {
            this.removeComponentByName(c.constructor.name);
        });

        this.cleanupCallbacks.forEach((cb) => {
            cb(this);
        });
    }
}

export interface IEntityBuilder {
    build(): Entity;
}

type ComponentArgs = Record<any, any>;

export class EntityBuilder implements IEntityBuilder {
    private world: World;
    private name: string | undefined;
    private componentRecipes: Array<{
        constructor: { new (): unknown };
        args?: Record<any, unknown>;
    }> = [];

    static create(world: World, name?: string): EntityBuilder {
        return new EntityBuilder(world, name);
    }

    constructor(world: World, name?: string) {
        this.world = world;
        this.name = name;
    }

    with<T extends Component>(
        componentConstuctor: { new (): T },
        args?: ComponentArgs
    ): EntityBuilder {
        return this.withComponent(componentConstuctor, args);
    }

    withComponent<T extends Component>(
        componentConstuctor: { new (): T },
        args?: ComponentArgs
    ): EntityBuilder {
        this.componentRecipes.push({
            constructor: componentConstuctor,
            args: args
        });
        return this;
    }

    build(): Entity {
        const entity = new Entity(this.world, this.name);
        this.componentRecipes.forEach(({ constructor, args }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entity.addComponent<any>(constructor, args);
        });
        return entity;
    }
}
