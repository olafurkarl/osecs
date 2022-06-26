/* eslint-disable @typescript-eslint/ban-types */
import { v4 as uuidv4 } from 'uuid';
import { Component, ComponentName } from './component';
import { System, SystemId } from './system';
import { World } from './world';

export type EntityId = string;

/**
 * A base class from which all game entities derive, supports adding and removing {@link Component | Components}
 */
export class Entity {
    public id: EntityId;
    public name = 'unknown';

    private parent: Entity | undefined;
    private world: World;
    private componentMask = 0;
    private cleanupCallbacks: { (): void }[] = [];

    private components: Map<ComponentName, Component>;
    private children: Map<EntityId, Entity>;
    private currentSystems = new Map<SystemId, System>();

    constructor(world: World, name?: string) {
        this.id = uuidv4().split('-')[0];
        this.components = new Map<EntityId, Component>();
        this.world = world;
        this.children = new Map<EntityId, Entity>();
        if (name) {
            this.name = name;
        }
    }

    addComponent<T extends Component>(
        component: T,
        ...args: Parameters<T['setValues']>
    ): void {
        component.setValues(...args);

        this.components.set(component.constructor.name, component);
        this.componentMask |=
            Component.ComponentMaskMap[component.constructor.name];

        this.world.updateRegistry(component.constructor.name, this);
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

        if (!component && this.parent) {
            component = this.parent.getOrInheritComponent(componentClass);
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

    getComponentMask(): number {
        return this.componentMask;
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
            this.componentMask &= ~Component.ComponentMaskMap[componentName];

            this.components.get(componentName)?.onComponentRemoved();
            this.components.delete(componentName);

            this.world.updateRegistry(componentName, this);
        }
    }
    equals(other: Entity): boolean {
        return this.id === other.id;
    }

    registerSystem(system: System): void {
        this.currentSystems.set(system.id, system);
    }

    unregisterSystem(system: System): void {
        this.currentSystems.delete(system.id);
    }

    addChild(entity: Entity): void {
        this.children.set(entity.id, entity);
        entity.parent = this;

        entity.getComponentNames().forEach((cn) => {
            this.world.updateParentRegistry(cn, this);
        });
    }

    removeChild(entity: Entity): void {
        this.children.delete(entity.id);
    }

    getChildren(): Entity[] {
        return Array.from(this.children.values());
    }

    getChildrenWithComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): Entity[] {
        return Array.from(this.children.values()).filter((child) =>
            child.hasComponent(componentClass)
        );
    }

    getParent(): Entity {
        if (!this.parent) {
            throw new Error(
                "Entity tried to fetch it's parent entity, but none was found"
            );
        }
        return this.parent;
    }

    addCleanupCallback(callback: () => void): void {
        this.cleanupCallbacks.push(callback);
    }

    destroy(): void {
        // use maintained list of registered systems and unregister entity
        this.currentSystems.forEach((s) => {
            s.unregisterEntity(this);
        });

        this.components.forEach((c) => {
            this.removeComponentByName(c.constructor.name);
        });

        this.cleanupCallbacks.forEach((cb) => {
            cb();
        });

        if (this.parent) {
            this.parent.removeChild(this);
        }

        this.children.forEach((c) => c.destroy());
    }

    toString(): string {
        const components = this.getComponentNames();
        components.toString = function () {
            return this.join('; ');
        };
        return `${this.name} entity, id:\n ${this.id},\n components:\n ${components}`;
    }
}

export class EntityBuilder {
    private readonly entity: Entity;
    private componentAddStack: (() => void)[] = [];

    static create(world: World, name?: string): EntityBuilder {
        return new EntityBuilder(world, name);
    }

    constructor(world: World, name?: string) {
        this.entity = new Entity(world, name);
    }

    withComponent<T extends Component>(
        component: T,
        ...args: Parameters<T['setValues']>
    ): EntityBuilder {
        component.setEntity(this.entity);
        this.componentAddStack.push(() => {
            this.entity.addComponent(component, ...args);
        });
        return this;
    }
    withChild(entity: Entity): EntityBuilder {
        this.entity.addChild(entity);
        return this;
    }
    build(): Entity {
        // We need our child components to be initialized before calling 'addComponent'
        this.componentAddStack.forEach((f) => f());
        return this.entity;
    }
}
