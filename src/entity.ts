/* eslint-disable @typescript-eslint/ban-types */
import {
    Component,
    ComponentArgs,
    ComponentConstructor,
    ComponentName
} from './component';
import { Mask } from './mask';
import { Query, QueryId } from './query';
import { World } from './world';

export type EntityId = string;

let nextEntitySerial = 0;
const generateEntityId = (): EntityId => `e${nextEntitySerial++}`;

export type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T
    ? 1
    : 2) extends <G>() => G extends U ? 1 : 2
    ? Y
    : N;
export type KeysOfType<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];
export type RequiredKeys<T> = Exclude<
    KeysOfType<T, Exclude<T[keyof T], undefined>>,
    undefined
>;
export type ExcludeOptionalProps<T> = Pick<T, RequiredKeys<T>>;

type RequiredFieldsOnly<T> = {
    [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};

/**
 * A base class from which all game entities derive, supports adding and removing {@link Component | Components}
 */
export class Entity {
    public id: EntityId;
    public name = 'unknown';
    public alive = true;

    private world: World;
    private _componentMask: Mask;
    private cleanupCallbacks: { (entity: Entity): void }[] = [];

    private components: Map<ComponentConstructor, Component>;
    private currentQueries = new Map<QueryId, Query>();

    constructor(world: World, opts?: EntityOpts) {
        this.id = opts?.id ?? generateEntityId();
        this.name = opts?.name ?? 'unnamed';
        this.components = new Map();
        this.world = world;
        this._componentMask = new Mask();
    }

    addComponent<T extends Component>(
        component: { new (): T },
        args?: ComponentArgs<T>
    ): void {
        const componentInstance = new component();
        componentInstance.setEntity(this);
        const fieldMap = Component.ComponentFieldMap.get(component);
        if (fieldMap && fieldMap.size > 0 && args) {
            componentInstance.setValues(args);
        }

        this.components.set(component, componentInstance);
        this._componentMask.flipOn(componentInstance.componentId - 1);

        this.world.updateRegistry(component, this);
    }

    /**
     * Alias for {@link upsertComponent}
     */
    upsert<T extends Component>(
        component: { new (): T },
        args?: ComponentArgs<T>
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
        args?: ComponentArgs<T>
    ): void {
        if (!this.hasComponent(component)) {
            this.addComponent(component, args);
        } else {
            this.components.get(component)?.setValues(args ?? {});
        }
    }

    /**
     * Alias for {@link getComponent}
     */
    get<T extends { new (...args: never): Component }>(
        componentClass: T | Component
    ): InstanceType<T> {
        return this.getComponent(componentClass);
    }

    /**
     * Gets a component from the entity by class
     * @param componentClass Class of component to get
     * @returns Component instance
     */
    getComponent<T extends { new (...args: never): Component }>(
        componentClass: T | Component
    ): InstanceType<T> {
        const key =
            componentClass instanceof Component
                ? (componentClass.constructor as ComponentConstructor)
                : (componentClass as unknown as ComponentConstructor);
        return this.components.get(key) as InstanceType<T>;
    }

    /**
     * @deprecated Class names may be mangled by minifiers/obfuscators.
     * Iterate components directly or work with class references instead.
     */
    getComponentNames(): ComponentName[] {
        return Array.from(this.components.keys()).map((c) => c.name);
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
        const key =
            componentClass instanceof Component
                ? (componentClass.constructor as ComponentConstructor)
                : (componentClass as unknown as ComponentConstructor);
        return this.components.has(key);
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
        const ctor = componentClass as unknown as ComponentConstructor;
        if (!this.components.has(ctor)) {
            console.log(
                `${this.name} tried to remove ${componentClass.name} but did not have it.`
            );
            return;
        }

        const id = Component.ComponentIdMap.get(ctor);
        if (id !== undefined) {
            this._componentMask.flipOff(id - 1);
        }

        this.components.get(ctor)?.onComponentRemoved();
        this.components.delete(ctor);

        this.world.updateRegistry(ctor, this);
    }

    /**
     * @deprecated Class names may be mangled by minifiers/obfuscators.
     * Use {@link removeComponent} with a class reference instead.
     */
    removeComponentByName(componentName: ComponentName): void {
        for (const ctor of this.components.keys()) {
            if (ctor.name === componentName) {
                this.removeComponent(ctor);
                return;
            }
        }
        console.log(
            `${this.name} tried to remove ${componentName} but did not have it.`
        );
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

        this.alive = false;

        this.world.markDeadEntity(this);
    }

    purge(): void {
        // Snapshot keys to avoid mutating during iteration.
        const ctors = Array.from(this.components.keys());
        ctors.forEach((ctor) => {
            this.removeComponent(ctor);
        });

        this.cleanupCallbacks.forEach((cb) => {
            cb(this);
        });
    }
}

export interface IEntityBuilder {
    build(): Entity;
}

export type EntityOpts = {
    id?: string;
    name?: string;
};
export class EntityBuilder implements IEntityBuilder {
    private world: World;
    private opts: EntityOpts | undefined;
    private componentRecipes: Array<{
        constructor: { new (): unknown };
        args?: Record<any, unknown>;
    }> = [];

    static create(world: World, opts?: EntityOpts): EntityBuilder {
        return new EntityBuilder(world, opts);
    }

    constructor(world: World, opts?: EntityOpts) {
        this.world = world;
        this.opts = opts;
    }

    with<T extends Component>(
        componentConstructor: { new (): T },
        args?: ComponentArgs<T>
    ): EntityBuilder {
        this.componentRecipes.push({
            constructor: componentConstructor,
            args: args
        });
        return this;
    }

    build(): Entity {
        const entity = new Entity(this.world, this.opts);
        this.componentRecipes.forEach(({ constructor, args }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entity.addComponent<any>(constructor, args);
        });

        this.world.mapEntity(entity);
        return entity;
    }
}
