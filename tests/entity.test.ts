import { RegisterComponent, Component, World, field } from '../src';

@RegisterComponent
class ATestComponent extends Component {
    @field declare test: boolean;
}

test('throws error when spawning entity with duplicate id', () => {
    const world = World.create();

    world.spawnEntity({ id: 'duplicate' }).build();

    expect(() => {
        world.spawnEntity({ id: 'duplicate' }).build();
    }).toThrow('Entity with id "duplicate" already exists in the world.');
});

test('upsertComponent updates data on entity', () => {
    const world = World.create();

    const entity = world.spawnEntity().with(ATestComponent).build();

    entity.upsert(ATestComponent, { test: true });

    expect(entity.getComponent(ATestComponent).test).toEqual(true);
});
