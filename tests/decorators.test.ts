import {
    RegisterComponent,
    Component,
    Entity,
    EntityBuilder,
    World,
    parent,
    field
} from '../src';

@RegisterComponent
class TestParentComponent extends Component {
    @field declare children: Entity[];
}

@RegisterComponent
class TestChildComponent extends Component {
    @field @parent(TestParentComponent, 'children') declare parent: Entity;
}

describe('Parent decorator', () => {
    it('adds parent component to referenced parent entity if it is not already present', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        EntityBuilder.create(world)
            .withComponent(TestChildComponent, { parent: parentEntity })
            .build();

        expect(parentEntity.hasComponent(TestParentComponent)).toEqual(true);
    });

    it('added parent component correctly references child', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        const childEntity = EntityBuilder.create(world)
            .withComponent(TestChildComponent, { parent: parentEntity })
            .build();

        expect(parentEntity.get(TestParentComponent).children).toContain(
            childEntity
        );
    });

    it('child component correctly references parent', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        const childEntity = EntityBuilder.create(world)
            .withComponent(TestChildComponent, { parent: parentEntity })
            .build();

        expect(childEntity.get(TestChildComponent).parent.id).toEqual(
            parentEntity.id
        );
    });

    it('child component has component removed if referenced entity is purged', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        const childEntity = EntityBuilder.create(world)
            .withComponent(TestChildComponent, { parent: parentEntity })
            .build();

        parentEntity.purge();

        expect(childEntity.has(TestChildComponent)).toEqual(false);
    });
});
