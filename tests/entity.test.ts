import { RegisterComponent, Component, World, field } from '../src';

@RegisterComponent
class ATestComponent extends Component {
    @field declare test: boolean;
}

test('upsertComponent updates data on entity', () => {
    const world = World.create();

    const entity = world.spawnEntity().with(ATestComponent).build();

    entity.upsert(ATestComponent, { test: true });

    expect(entity.getComponent(ATestComponent).test).toEqual(true);
});
