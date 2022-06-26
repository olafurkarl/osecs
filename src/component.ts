/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Component that can be attached to entities.
 */

import Entity from './entity';
import { v4 as uuidv4 } from 'uuid';
export default abstract class Component {
    private declare entity: Entity;
    private id: string;

    constructor() {
        this.id = uuidv4();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types
    init(args?: Object): void {
        // nothing implemented for init by default
        return;
    }

    getId(): string {
        return this.id;
    }

    setEntity(entity: Entity): void {
        this.entity = entity;
    }

    getEntity(): Entity {
        if (!this.entity) {
            throw new Error(
                "Component tried to fetch it's entity, but none was found"
            );
        }
        return this.entity;
    }

    public onComponentRemoved: () => void = () => {
        // no-op
    };

    getMask = (): number => {
        return ComponentMaskMap[this.constructor.name];
    };
}

// TODO: Move this into World
export const ComponentMaskMap: Record<string, number> = {};

export function RegisterComponent<
    T extends { new (...args: any[]): Component }
>(constructor: T): any {
    const componentSuffix = 'Component';
    if (!constructor.name.includes(componentSuffix)) {
        throw new Error(
            `Illegal name of component class. Component name must end in "${componentSuffix}".`
        );
    }
    const keyName = constructor.name;

    // At some point we might have more than 53 components, in which case we need to be more clever
    // about how we deal with our masks since MAX_SAFE_INTEGER in JS is 2^53
    const componentMaskShift = Object.keys(ComponentMaskMap).length;
    const componentMask = 1 << componentMaskShift;

    ComponentMaskMap[keyName] = componentMask;
}
