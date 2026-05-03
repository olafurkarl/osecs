import { RegisterComponent, Component, World, field } from '../src';

@RegisterComponent
class ATestComponent extends Component {
    @field test!: boolean;
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

test('entity id is freed for reuse after destroy + purge', () => {
    const world = World.create();

    const first = world.spawnEntity({ id: 'reusable' }).build();
    first.destroy();

    // Two ticks: first moves dead -> toBePurged, second purges.
    world.run();
    world.run();

    expect(world.getEntityById('reusable')).toBeUndefined();

    expect(() => {
        world.spawnEntity({ id: 'reusable' }).build();
    }).not.toThrow();

    expect(world.getEntityById('reusable')).toBeDefined();
});

test('removeComponent returns true on remove, false when not present', () => {
    const world = World.create();
    const entity = world.spawnEntity().with(ATestComponent).build();

    expect(entity.removeComponent(ATestComponent)).toBe(true);
    expect(entity.removeComponent(ATestComponent)).toBe(false);
    expect(entity.hasComponent(ATestComponent)).toBe(false);
});

test('destroyed entity remains resolvable until purge completes', () => {
    const world = World.create();

    const entity = world.spawnEntity({ id: 'delayed' }).build();
    entity.destroy();

    // Before any run: still in the map (destroy only marks dead).
    expect(world.getEntityById('delayed')).toBe(entity);

    // After one run: entity moved from deadEntities into entitiesToBePurged
    // but not yet purged — the two-tick delay means it's still resolvable
    // so systems that race with destroy on the same tick don't break.
    world.run();
    expect(world.getEntityById('delayed')).toBe(entity);

    // After second run: purge step runs and the id is freed.
    world.run();
    expect(world.getEntityById('delayed')).toBeUndefined();
});
