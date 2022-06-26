/* eslint-disable @typescript-eslint/ban-types */
import { v4 as uuidv4 } from 'uuid';
import { Component, ComponentMaskMap } from './component';
import { World } from './world';

/**
 * A base class from which all game entities derive, supports adding and removing {@link Component | Components}
 */
export class Entity {
    public id: string;
    public active = true;

    private components: Map<string, Component>;
    private parent: Entity | undefined;
    private children: Entity[] = [];
    public name = 'unknown';
    private world: World;

    private componentMask = 0;

    private cleanupCallbacks: { (): void }[] = [];

    constructor(world: World, name?: string) {
        this.id = uuidv4();
        this.components = new Map<string, Component>();
        this.world = world;
        if (name) {
            this.name = name;
        }
    }

    addComponent(component: Component): void {
        this.components.set(component.constructor.name, component);
        this.world.onComponentAdded(this);

        this.componentMask |= ComponentMaskMap[component.constructor.name];
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
                `Component: ${componentClass.name} not found on Entity (name: ${this.name}; id: ${this.id})`
            );
        }
        return component;
    }

    getComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): InstanceType<T> {
        return this.components.get(componentClass.name) as InstanceType<T>;
    }

    getComponentNames(): string[] {
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

    removeComponentByName(componentName: string): void {
        if (this.components.has(componentName)) {
            const removeCallback = () => {
                this.components.get(componentName)?.onComponentRemoved();
                this.components.delete(componentName);
            };
            this.world.onComponentRemoved({
                entity: this,
                componentName: componentName,
                onRemove: removeCallback
            });

            this.componentMask &= ~ComponentMaskMap[componentName];
        }
    }
    equals(other: Entity): boolean {
        return this.id === other.id;
    }

    addChild(entity: Entity): void {
        this.children.push(entity);
    }

    // todo: not performant. probably good to switch to a map or something.
    removeChild(entity: Entity): void {
        this.children = this.children.filter((c) => c.id !== entity.id);
    }

    getChildren(): Entity[] {
        return this.children;
    }

    getChildrenWithComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): Entity[] {
        return this.children.filter((child) =>
            child.hasComponent(componentClass)
        );
    }

    setParent(entity: Entity): void {
        this.parent = entity;
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

    static create(world: World, name?: string): EntityBuilder {
        return new EntityBuilder(world, name);
    }

    constructor(world: World, name?: string) {
        this.entity = new Entity(world, name);
    }

    withComponent(
        component: Component,
        args?: Object | undefined
    ): EntityBuilder {
        // set entity
        component.setEntity(this.entity);
        // call init after entity has been set
        component.init();
        this.entity.addComponent(component);
        return this;
    }
    withChild(entity: Entity): EntityBuilder {
        entity.setParent(this.entity);
        this.entity.addChild(entity);
        return this;
    }
    build(): Entity {
        return this.entity;
    }
}
