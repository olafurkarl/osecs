import { Aspect, HasAspect, WithoutAspect } from './aspect';
import { Entity, EntityId } from './entity';
import { v4 as uuidv4 } from 'uuid';
import { Mask } from './mask';

export type QueryId = string;

type ChangeSet = {
    added: Array<Entity>;
    removed: Array<Entity>;
};

export class Query {
    public id: QueryId;

    private _aspects: Aspect[] = [];

    private declare _includeMask: Mask;
    private declare _excludeMask: Mask;

    private _entities: Map<EntityId, Entity>;

    private currentChangeSet: 0 | 1 = 0;
    private changeSets: [ChangeSet, ChangeSet] = [
        {
            added: [],
            removed: []
        },
        {
            added: [],
            removed: []
        }
    ];

    constructor(aspects: Aspect[]) {
        this._aspects = aspects;
        this.initializeMasks();
        this._entities = new Map<string, Entity>();
        this.id = uuidv4();
    }

    get nextChangeSetIndex(): 0 | 1 {
        // 0 becomes 1, 1 becomes 0
        return ((this.currentChangeSet + 1) % 2) as 0 | 1;
    }

    get added() {
        return this.changeSets[this.currentChangeSet].added;
    }

    get removed() {
        return this.changeSets[this.currentChangeSet].removed;
    }

    get nextAdded() {
        return this.changeSets[this.nextChangeSetIndex].added;
    }

    get nextRemoved() {
        return this.changeSets[this.nextChangeSetIndex].removed;
    }

    get current() {
        return Array.from(this._entities.values());
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

    get entities(): Map<string, Entity> {
        return this._entities;
    }

    initializeMasks(): void {
        this._includeMask = new Mask();

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
            }
        });

        if (this._includeMask.empty) {
            this._includeMask.flipAllToOne();
        }

        if (!this._includeMask.enabled && this._excludeMask.enabled) {
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
        const doesntExclude = this.checkExcludeMask(entity);
        return doesInclude && doesntExclude;
    }

    updateRegistry = (entity: Entity) => {
        const registerThisEntity = this.shouldRegisterEntity(entity);

        if (this.hasEntity(entity) && !registerThisEntity) {
            this.nextRemoved.push(entity);
            this.unregisterEntity(entity);
        } else if (registerThisEntity) {
            this.nextAdded.push(entity);
            this.registerEntity(entity);
        }
    };

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

    flushQuery = () => {
        this.currentChangeSet = this.nextChangeSetIndex;
        this.nextAdded.length = 0;
        this.nextRemoved.length = 0;
    };
}
