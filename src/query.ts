import { Aspect, HasAspect, ParentHasAspect, WithoutAspect } from './aspect';
import { Entity } from './entity';
import { v4 as uuidv4 } from 'uuid';
import { Mask } from './mask';

export type QueryId = string;

export class Query {
    public id: QueryId;

    private _aspects: Aspect[] = [];

    private declare _includeMask: Mask;
    private declare _excludeMask: Mask;
    private declare _parentMask: Mask;

    private _entities: Map<string, Entity>;

    constructor(aspects: Aspect[]) {
        this._aspects = aspects;
        this.initializeMasks();
        this._entities = new Map<string, Entity>();
        this.id = uuidv4();
    }

    get aspects() {
        return this._aspects;
    }

    get includeMask(): Mask {
        return this._includeMask;
    }

    get excludeMask(): Mask {
        return this._excludeMask;
    }

    get parentIncludeMask(): Mask {
        return this._parentMask;
    }

    get entities(): Map<string, Entity> {
        return this._entities;
    }

    initializeMasks(): void {
        this._includeMask = new Mask();
        this._parentMask = new Mask();

        this._excludeMask = new Mask();
        this._excludeMask.flipAllToOne();

        this.aspects.forEach((aspect) => {
            switch (aspect.constructor) {
                case HasAspect: {
                    this._includeMask.flipOn(aspect.bitFlag);
                    this._includeMask.enable();
                    break;
                }
                case WithoutAspect: {
                    this._excludeMask.flipOff(aspect.bitFlag);
                    this._excludeMask.enable();
                    break;
                }
                case ParentHasAspect: {
                    this._parentMask.flipOn(aspect.bitFlag);
                    this._parentMask.enable();
                    break;
                }
            }
        });

        if (this._includeMask.empty) {
            this._includeMask.flipAllToOne();
        }
        if (this._parentMask.empty) {
            this._parentMask.flipAllToOne();
        }

        if (
            !this._parentMask.enabled &&
            !this._includeMask.enabled &&
            this._excludeMask.enabled
        ) {
            throw new Error(
                'Query with only Without aspects not supported, add an inclusive aspect to the query.'
            );
        }
    }

    checkIncludeMask = (entity: Entity): boolean =>
        !this._includeMask.enabled ||
        this._includeMask.fulfilledBy(entity.componentMask);

    checkExcludeMask = (entity: Entity): boolean =>
        !this._excludeMask.enabled ||
        this._excludeMask.fulfills(entity.componentMask);

    checkParentMask = (entity: Entity): boolean =>
        !this._parentMask.enabled ||
        (entity.hasParent() &&
            this._parentMask.fulfilledBy(entity.parent.componentMask));

    /**
     * Check whether an entity is currently being tracked by this query
     * @param entity Entity to check
     * @returns whether the entity is in the query's entity list
     */
    hasEntity(entity: Entity): boolean {
        return this._entities.has(entity.id);
    }

    /**
     * Adds an entity to this query's entity track list
     * @param entity Entity to add
     */
    registerEntity(entity: Entity): void {
        if (!this.hasEntity(entity)) {
            this._entities.set(entity.id, entity);
            entity.registerQuery(this);
        }
    }

    /**
     * Remove an entity from this query's entity track list
     * @param entity Entity to remove
     */
    unregisterEntity(entity: Entity): void {
        this._entities.delete(entity.id);
        entity.unregisterQuery(this);
    }

    shouldRegisterEntity(entity: Entity) {
        const doesInclude = this.checkIncludeMask(entity);
        const doesParentInclude = this.checkParentMask(entity);
        const doesntExclude = this.checkExcludeMask(entity);
        return doesInclude && doesParentInclude && doesntExclude;
    }

    /**
     * Just for convenience / syntactic sugar
     */
    forEach(
        callbackfn: (
            value: Entity,
            key: string,
            map: Map<string, Entity>
        ) => void
    ) {
        this._entities.forEach(callbackfn);
    }
}
