import {
    RegisterComponent,
    Component,
    Entity,
    EntityBuilder,
    World,
    field
} from '../src';
import { children, parent } from '../src/decorators';

@RegisterComponent
class TestParentComponent extends Component {
    @field @children accessor children!: Set<Entity>;
}

@RegisterComponent
class TestChildComponent extends Component {
    @field @parent(TestParentComponent, 'children') accessor parent!: Entity;
}

@RegisterComponent
class TestRegularComponent extends Component {
    @field
    public accessor something: number;
}

describe('Field decorator', () => {
    it('Adds its own name to the static ComponentFieldMap', () => {
        const component = new TestRegularComponent();
        console.log(Component.ComponentFieldMap['TestRegularComponent'])
        expect(Component.ComponentFieldMap['TestRegularComponent'].get('something')).toEqual({
            fieldName: 'something'
        })
    })
})

describe('Parent decorator', () => {
    it('adds parent component to referenced parent entity if it is not already present', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        EntityBuilder.create(world)
            .with(TestChildComponent, { parent: parentEntity })
            .build();

        expect(parentEntity.hasComponent(TestParentComponent)).toEqual(true);
    });

    it('adds parent component to new referenced parent entity and removes it from old parent entity', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        const childEntity = EntityBuilder.create(world)
            .with(TestChildComponent, { parent: parentEntity })
            .build();

        const newParentEntity = builder.build();
        childEntity.get(TestChildComponent).parent = newParentEntity;

        expect(parentEntity.hasComponent(TestParentComponent)).toEqual(false);
        expect(newParentEntity.hasComponent(TestParentComponent)).toEqual(true);
    });

    it('added parent component correctly references child', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        const childEntity = EntityBuilder.create(world)
            .with(TestChildComponent, { parent: parentEntity })
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
            .with(TestChildComponent, { parent: parentEntity })
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
            .with(TestChildComponent, { parent: parentEntity })
            .build();

        parentEntity.purge();

        expect(childEntity.has(TestChildComponent)).toEqual(false);
    });

    it('parent component has child removed if referenced entity is purged', () => {
        const world = World.create().build();
        const builder = EntityBuilder.create(world);

        const parentEntity = builder.build();
        const childEntity = EntityBuilder.create(world)
            .with(TestChildComponent, { parent: parentEntity })
            .build();

        childEntity.purge();

        expect(parentEntity.get(TestParentComponent).children).not.toContain(
            childEntity
        );
    });
});
