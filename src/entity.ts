/* eslint-disable @typescript-eslint/ban-types */
import { v4 as uuidv4 } from 'uuid';
import Component from './component';
import { EventEmitter } from 'events';
import { SystemEvents, World } from './world';
import events from './events';

/**
 * A base class from which all game entities derive, supports adding and removing {@link Component | Components}
 */
export default class Entity extends EventEmitter {
    public id: string;
    public active = true;

    private components: Partial<Record<string, Component>>;
    private parent: Entity | undefined;
    private children: Entity[] = [];
    public name = 'unknown';
    private world: World;

    constructor(world: World, name?: string) {
        super();
        this.id = uuidv4();
        this.components = {};
        this.world = world;
        if (name) {
            this.name = name;
        }
    }

    addComponent(component: Component): void {
        this.components[component.constructor.name] = component;
        if (component.onComponentRemoved) {
            this.once(events.ENT_DESTROYED, () => {
                component.onComponentRemoved?.();
            });
        }

        this.world.onComponentAdded(this);
        this.setMaxListeners(this.getMaxListeners() + 1);
    }

    getComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): InstanceType<T> {
        let component = this.components[componentClass.name] as InstanceType<T>;
        if (!component && this.parent) {
            component = this.parent.getComponent(componentClass);
        }
        if (!component) {
            throw new Error(
                `Component: ${componentClass.name} not found on Entity (name: ${this.name}; id: ${this.id})`
            );
        }
        return component;
    }

    getAllComponents(): Partial<Record<string, Component>> {
        return this.components;
    }

    getComponentMask(): number {
        return Object.values(this.components)
            .filter((c): c is Component => !!c)
            .map((c) => c.getMask())
            .reduce((prev, cur) => prev | cur, 0);
    }

    hasComponent<T extends { new (...args: never): Component }>(
        componentClass: T | Component
    ): boolean {
        if (componentClass instanceof Component) {
            return !!this.components[componentClass.constructor.name];
        }
        return !!this.components[componentClass.name];
    }

    removeComponent<T extends { new (...args: never): Component }>(
        componentClass: T
    ): void {
        if (this.hasComponent(componentClass)) {
            const removeCallback = () => {
                this.getComponent(componentClass).onComponentRemoved();
                delete this.components[componentClass.name];
            };
            this.world.onComponentRemoved({
                entity: this,
                componentName: componentClass.name,
                onRemove: removeCallback
            });
        }
    }

    equals(other: Entity): boolean {
        return this.id === other.id;
    }

    addChild(entity: Entity): void {
        this.children.push(entity);
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

    override toString(): string {
        const components = Object.keys(this.getAllComponents());
        components.toString = function () {
            return this.join('; ');
        };
        return `${this.name} entity, id:\n ${this.id},\n components:\n ${components}`;
    }
}

export class EntityBuilder {
    private readonly entity: Entity;
    private world: World;
    constructor(world: World, name?: string) {
        this.entity = new Entity(world, name);
        this.world = world;
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
        SystemEvents.emit(events.ENT_CREATED, this.entity);
        return this.entity;
    }
}
