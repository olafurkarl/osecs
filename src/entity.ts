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

    hasComponent<T extends { new (...args: never): Component }>(
        componentClass: T | Component
    ): boolean {
        if (componentClass instanceof Component) {
            return this.components.has(componentClass.constructor.name);
        }
        return this.components.has(componentClass.name);
    }

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
    private readonly entity: Entity;

    static create(world: World, name?: string): EntityBuilder {
        return new EntityBuilder(world, name);
    }

    constructor(world: World, name?: string) {
        this.entity = new Entity(world, name);
    }

    withComponent<T extends Component>(
        componentConstuctor: { new (): T },
        ...args: Parameters<T['setValues']>
    ): EntityBuilder {
        const component = new componentConstuctor();
        this.entity.addComponent(component, ...args);
        return this;
    }

    withChild(entity: Entity): EntityBuilder {
        this.entity.addChild(entity);
        return this;
    }
    build(): Entity {
        return this.entity;
    }
}
