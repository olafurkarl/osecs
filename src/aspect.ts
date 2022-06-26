import { Component } from './component';

export class Aspect {
    public mask: number;
    public componentName: string;

    constructor(component: { new (...args: never): Component }) {
        this.componentName = component.name;
        this.mask = Component.ComponentMaskMap[component.name];
    }
}

export class HasAspect extends Aspect {}
export class WithoutAspect extends Aspect {}
export class ParentHasAspect extends Aspect {}

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

export const ParentHas = <T extends { new (...args: never): Component }>(
    component: T
): Aspect => {
    return new ParentHasAspect(component);
};
