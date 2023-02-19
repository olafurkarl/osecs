import { World } from './world';
import { v4 as uuidv4 } from 'uuid';
import { Aspect } from './aspect';
import { Query } from './query';
import { EntityBuilder } from '.';

export type SystemId = string;
export abstract class System {
    public id: SystemId;
    public declare world: World;
    private _queries: Query[] = [];

    constructor() {
        this.id = uuidv4();
    }

    abstract run(delta: number): void;

    get queries() {
        return this._queries;
    }

    protected query(aspects: Aspect[]): Query {
        const query = new Query(aspects);
        this._queries.push(query);
        return query;
    }

    protected spawnEntity(name?: string) {
        return EntityBuilder.create(this.world, name);
    }
}
