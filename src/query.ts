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
    /**
     * Flat array mirror of _entities for fast iteration. Deletions tombstone
     * the slot (set to null) and `compact` repacks during flushQuery, so
     * iteration order matches Map's insertion order and the array stays
     * stable across concurrent removals (e.g. an entity destroying itself
     * mid-forEach).
     */
    private _entityList: Array<Entity | null> = [];
    private _entityListIndex: Map<EntityId, number> = new Map();
    private _holes = 0;

    /**
     * Used by World.refreshQueriesForEntity to dedupe per-entity work without
     * allocating a Set on every entity build. World stamps a fresh tick into
     * this field; queries skip themselves when stamped.
     */
    public _visitedTick = -1;

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
        if (this._holes === 0) return this._entityList.slice() as Entity[];
        const out: Entity[] = [];
        for (const e of this._entityList) if (e !== null) out.push(e);
        return out;
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
    }

    /**
     * True for queries built only from Without aspects (no Has). The world
     * needs to route entity changes to these queries via a separate path,
     * because they don't appear in queryRegistry under any component.
     */
    get hasOnlyExclusiveAspects(): boolean {
        return !this._includeMask.enabled && this._excludeMask.enabled;
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
        this.nextAdded.push(entity);

        if (!this.hasEntity(entity)) {
            this._entities.set(entity.id, entity);
            this._entityListIndex.set(entity.id, this._entityList.length);
            this._entityList.push(entity);
            entity.registerQuery(this);
        }
    }

    /**
     * Remove an entity from this query's entity track list
     * @param entity Entity to remove
     */
    unregisterEntity(entity: Entity): void {
        this.nextRemoved.push(entity);
        if (this._entities.delete(entity.id)) {
            const idx = this._entityListIndex.get(entity.id);
            if (idx !== undefined) {
                this._entityList[idx] = null;
                this._entityListIndex.delete(entity.id);
                this._holes++;
            }
        }
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
            this.unregisterEntity(entity);
        } else if (registerThisEntity) {
            this.registerEntity(entity);
        }
    };

    /**
     * Iterate the entities currently matching this query. Re-reads list length
     * each iteration so entities registered mid-forEach are visited (matching
     * Map.forEach semantics); tombstoned slots from concurrent removals are
     * skipped.
     */
    forEach(callbackfn: (entity: Entity) => void) {
        const list = this._entityList;
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (e !== null) callbackfn(e);
        }
    }

    /**
     * Repack _entityList in place so tombstoned slots don't accumulate. Called
     * from flushQuery — at most once per world tick — keeping per-iteration
     * null-check overhead bounded.
     */
    private compact() {
        const list = this._entityList;
        let write = 0;
        for (let read = 0; read < list.length; read++) {
            const e = list[read];
            if (e === null) continue;
            if (write !== read) {
                list[write] = e;
                this._entityListIndex.set(e.id, write);
            }
            write++;
        }
        list.length = write;
        this._holes = 0;
    }

    flushQuery = () => {
        this.currentChangeSet = this.nextChangeSetIndex;
        this.nextAdded.length = 0;
        this.nextRemoved.length = 0;
        if (this._holes > 0) this.compact();
    };
}
