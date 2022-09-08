/* eslint-disable @typescript-eslint/ban-types */
import { v4 as uuidv4 } from 'uuid';
import { Aspect } from './aspect';
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

    private _parent: Entity | undefined;
    private world: World;
    private _componentMask: Mask;
    private cleanupCallbacks: { (): void }[] = [];

    private components: Map<ComponentName, Component>;
    private children: Map<EntityId, Entity>;
    private currentQueries = new Map<QueryId, Query>();

    constructor(world: World, name?: string) {
        this.id = uuidv4().split('-')[0];
        this.components = new Map<EntityId, Component>();
        this.world = world;
        this.children = new Map<EntityId, Entity>();
        this._componentMask = new Mask();
        if (name) {
            this.name = name;
        }
    }

    addComponent<T extends Component>(
        component: T,
        ...args: Parameters<T['setValues']>
    ): void {
        component.setEntity(this);
        component.setValues(...args);

        this.components.set(component.constructor.name, component);
        this._componentMask.flipOn(component.componentId - 1);

        this.world.updateRegistry(component.constructor.name, this);
        this.children.forEach((child) => {
            this.world.updateRegistry(component.constructor.name, child);
        });
    }

    /**
     * Alias for {@link upsertComponent}
     */
    upsert<T extends Component>(
        component: T,
        ...args: Parameters<T['setValues']>
    ): void {
        this.upsertComponent(component, ...args);
    }

    /**
     * Add or update a given component
     * @param component Component to update
     * @param args Values to set on component
     */
    upsertComponent<T extends Component>(
        component: T,
        ...args: Parameters<T['setValues']>
    ): void {
        if (!this.hasComponent(component)) {
            this.addComponent(component, ...args);
        } else {
            this.components.get(component.constructor.name)?.setValues(...args);
        }
    }

    /**
     * Alias for {@link getOrInheritComponent}
     */
    inherit<T extends { new (...args: never): Component }>(
        componentClass: T
    ): InstanceType<T> {
        return this.getOrInheritComponent(componentClass);
    }

    /**
     * Finds and return a given component on this entity, or any parent entity
     * @param componentClass Component to fetch
     * @returns Component instance
     */
    getOrInheritComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): InstanceType<T> {
        let component = this.getComponent(componentClass);

        if (!component && this._parent) {
            component = this._parent.getOrInheritComponent(componentClass);
        }
        if (!component) {
            throw new Error(
                `getOrInheritComponent: Component: ${componentClass.name} not found on Entity (name: ${this.name}; id: ${this.id})`
            );
        }
        return component;
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
            this.children.forEach((child) => {
                this.world.updateRegistry(componentName, child);
            });
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

    addChild(entity: Entity): void {
        this.children.set(entity.id, entity);
        entity._parent = this;

        this.getComponentNames().forEach((cn) => {
            this.world.updateRegistry(cn, entity);
        });
        entity.getComponentNames().forEach((cn) => {
            this.world.updateRegistry(cn, entity);
        });
    }

    removeChild(entity: Entity): void {
        this.children.delete(entity.id);
    }

    getChildren(): Entity[] {
        return Array.from(this.children.values());
    }

    getChildrenByQuery(aspects: Aspect[]): Entity[] {
        const query = new Query(aspects);
        return Array.from(this.children.values()).filter(
            (child) =>
                query.checkIncludeMask(child) && query.checkExcludeMask(child)
        );
    }

    hasParent(): boolean {
        return !!this._parent;
    }

    get parent(): Entity {
        if (!this._parent) {
            throw new Error(
                "Entity tried to fetch it's parent entity, but none was found"
            );
        }
        return this._parent;
    }

    addCleanupCallback(callback: () => void): void {
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
            cb();
        });

        if (this._parent) {
            this._parent.removeChild(this);
        }

        this.children.forEach((c) => c.destroy());
    }

    toString(): string {
        const components = Array.from(this.components.values());

        let componentString = '';
        components.forEach(
            (c) => (componentString += `<li>${c.toString()}</li>`)
        );
        let string = `<p>${this.name} entity id: ${this.id}</p> components:<ul>${componentString}<ul>`;
        Array.from(this.children.values()).forEach(
            (c) =>
                (string += `<div style="text-indent: 5px">${c.toString()}</div>`)
        );
        return string;
    }
}

export class EntityBuilder {
    private world: World;
    private name: string | undefined;
    private componentRecipes: Array<{
        constructor: { new (): unknown };
        args: unknown[];
    }> = [];
    private children: Entity[] = [];

    static create(world: World, name?: string): EntityBuilder {
        return new EntityBuilder(world, name);
    }

    constructor(world: World, name?: string) {
        this.world = world;
        this.name = name;
    }

    with<T extends Component>(
        componentConstuctor: { new (): T },
        ...args: Parameters<T['setValues']>
    ): EntityBuilder {
        return this.withComponent(componentConstuctor, ...args);
    }

    withComponent<T extends Component>(
        componentConstuctor: { new (): T },
        ...args: Parameters<T['setValues']>
    ): EntityBuilder {
        this.componentRecipes.push({
            constructor: componentConstuctor,
            args: args
        });
        return this;
    }

    withChild(entity: Entity): EntityBuilder {
        this.children.push(entity);
        return this;
    }

    build(): Entity {
        const entity = new Entity(this.world, this.name);
        this.children.forEach((child) => {
            entity.addChild(child);
        });
        this.componentRecipes.forEach(({ constructor, args }) => {
            const component = new constructor();
            entity.addComponent<any>(component, ...args);
        });
        return entity;
    }
}
