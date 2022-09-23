import { Component } from './component';

export class Aspect {
    public bitFlag: number;
    public componentName: string;

    constructor(component: { new (...args: never): Component }) {
        this.componentName = component.name;
        this.bitFlag = Component.ComponentIdMap[component.name] - 1;
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
