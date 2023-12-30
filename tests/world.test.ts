import { System, World } from '../src';

class First extends System {
    order = 1;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    run() {}
}

class Second extends System {
    order = 2;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    run() {}
}

class Third extends System {
    order = 3;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    run() {}
}

it('sorts systems by their order when initializing', () => {
    const world = World.create()
        .addSystem(First)
        .addSystem(Third)
        .addSystem(Second);
    world.run();

    expect((world as any).systems[0]).toBeInstanceOf(First);
    expect((world as any).systems[1]).toBeInstanceOf(Second);
    expect((world as any).systems[2]).toBeInstanceOf(Third);
});
