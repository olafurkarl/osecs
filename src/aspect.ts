import { Component, ComponentConstructor } from './component';

export class Aspect {
    public bitFlag: number;
    public component: ComponentConstructor;

    constructor(component: { new (...args: never): Component }) {
        this.component = component as unknown as ComponentConstructor;
        const id = Component.ComponentIdMap.get(this.component);
        this.bitFlag = (id ?? 0) - 1;
    }
}

export class HasAspect extends Aspect {}
export class WithoutAspect extends Aspect {}

export const Has = <T extends { new (...args: never): Component }>(
    component: T
): Aspect => {
    return new HasAspect(component);
};

export const Without = <T extends { new (...args: never): Component }>(
    component: T
): Aspect => {
    return new WithoutAspect(component);
};
