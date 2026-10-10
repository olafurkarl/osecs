# OSECS

Oli's Simple ECS: a small entity-component-system library for TypeScript/JavaScript.

- Components are plain classes; systems declare queries made of `Has`/`Without` aspects.
- Queries track `added` and `removed` entities between frames.
- Built-in parent/child relationships between entities.
- Uses standard (TC39) decorators, so no `experimentalDecorators` flag is needed.
- Ships ESM and CJS builds with type definitions.

## Installation

```sh
npm install osecs
```

Requires TypeScript 5.0+ (or another toolchain that supports standard decorators, such as Bun or esbuild). Do **not** enable `experimentalDecorators` in your `tsconfig.json`. If you're upgrading from 0.x, see [MIGRATION-1.0.0.md](./MIGRATION-1.0.0.md).

## Quick start

```ts
import { Component, Has, RegisterComponent, System, World } from 'osecs';

// 1. Define components. Every component class needs @RegisterComponent.
@RegisterComponent
class Position extends Component {
    x = 0;
    y = 0;
}

@RegisterComponent
class Velocity extends Component {
    x = 0;
    y = 0;
}

// 2. Define systems. Queries are declared as fields and kept up to date by the world.
class MovementSystem extends System {
    private moving = this.queryWith(
        [Has(Position), Has(Velocity)],
        [Position, Velocity]
    );

    run(delta: number) {
        this.moving.forEachWith((_entity, pos: Position, vel: Velocity) => {
            pos.x += vel.x * delta;
            pos.y += vel.y * delta;
        });
    }
}

// 3. Create a world, add systems, spawn entities.
const world = World.create();
world.addSystem(MovementSystem);

const ship = world
    .spawnEntity({ name: 'ship' })
    .with(Position)
    .with(Velocity)
    .build();
ship.get(Velocity).x = 2;

// 4. Tick the world from your game loop.
world.run(1);
console.log(ship.get(Position).x); // 2
```

## Components

A component is a class that extends `Component` and is decorated with `@RegisterComponent`. Its properties can be initialised with plain class field defaults, as in the quick start.

To pass values when you add a component, mark the properties with `@field`. Every `@field` property must then be given a value:

```ts
import { Component, RegisterComponent, field } from 'osecs';

@RegisterComponent
class Health extends Component {
    @field max!: number;
    @field current!: number;
}

world.spawnEntity().with(Health, { max: 100, current: 100 }).build();
```

## Entities

Create entities with `world.spawnEntity()` (or `this.spawnEntity()` inside a system), which returns a builder:

```ts
const entity = world
    .spawnEntity({ name: 'goblin' }) // id and name are optional
    .with(Position)
    .with(Health, { max: 30, current: 30 })
    .build();

entity.has(Health);                   // true
entity.get(Health).current -= 5;
entity.upsert(Health, { max: 50, current: 50 }); // adds the component, or updates it if present
entity.remove(Velocity);              // returns false if the entity didn't have it
entity.destroy();                     // removed from queries now, purged on a later world.run (see below)
world.getEntityById(entity.id);
```

`get`, `has`, `remove` and `upsert` are short aliases for `getComponent`, `hasComponent`, `removeComponent` and `upsertComponent`.

## Systems and queries

Subclass `System` and implement `run(delta)`. Declare queries as class fields:

```ts
import { Has, Without, System } from 'osecs';

class AiSystem extends System {
    order = 10; // systems run in ascending `order` (default 0)

    // Entities with Position and Health but no Player component
    private npcs = this.query([Has(Position), Has(Health), Without(Player)]);

    // Same, with Position and Health handed straight to forEachWith
    private fast = this.queryWith(
        [Has(Position), Has(Health), Without(Player)],
        [Position, Health]
    );

    initialize() {
        // Called once, before the first world.run
    }

    run(delta: number) {
        this.npcs.forEach((e) => { /* e.get(Position) ... */ });
        this.fast.forEachWith((e, pos: Position, hp: Health) => { /* ... */ });

        this.npcs.current;  // Entity[] snapshot of the current matches
        this.npcs.added;    // entities that started matching since last frame
        this.npcs.removed;  // entities that stopped matching since last frame
    }
}

world.addSystem(AiSystem);
```

Prefer `queryWith` + `forEachWith` on hot paths: it hands component instances to the callback without an `entity.get()` lookup per entity.

`addSystem` forwards any extra arguments to the system's constructor, and returns the world, so calls can be chained.

### What `world.run(delta)` does

1. On the first call: sorts systems by `order` and calls each `initialize()`.
2. Rotates every query's `added`/`removed` change sets.
3. Calls `run(delta)` on each system.
4. Purges entities destroyed during the *previous* frame: their components are removed, they're dropped from `getEntityById`, and their cleanup callbacks run. The extra frame gives systems a chance to see them in `removed`.
5. Calls any callbacks registered with `world.onRun(cb)`.

`delta` defaults to `1`.

## Parent/child relationships

Use `@parent` on the child side and `@children` on the parent side. Both decorators go on `accessor` properties:

```ts
import { Component, Entity, RegisterComponent, children, parent } from 'osecs';

@RegisterComponent
class Fleet extends Component {
    @children accessor ships!: Set<Entity>;
}

@RegisterComponent
class FleetMember extends Component {
    @parent(Fleet, 'ships') accessor fleet!: Entity;
}

const fleet = world.spawnEntity().build();
const ship = world.spawnEntity().with(FleetMember, { fleet }).build();

fleet.get(Fleet).ships.has(ship); // true: Fleet is added to the parent automatically
```

Reassigning `fleet` moves the child to the new parent. A destroyed child is removed from its parent's set when it gets purged.

## Performance

Median per-entity cost measured on 2.1.1 (Ryzen 7 8700F, Bun 1.3). Lower is better:

| Scenario                               | 1K entities | 65K entities |
|----------------------------------------|------------:|-------------:|
| Create entity (3 components)           |      628 ns |      1.28 µs |
| Destroy entity                         |      255 ns |       476 ns |
| Iterate, read 3 components             |        6 ns |        22 ns |
| Remove + re-add a component            |       67 ns |   146 ns ¹ |
| 2 systems, mixed entities              |        5 ns |        38 ns |
| 7 systems, mixed entities              |        9 ns |        58 ns |

¹ Measured at 16K entities.

The full results, scenarios and methodology are in [BENCHMARKS.md](./BENCHMARKS.md). The scenarios are ported from [abeimler/ecs_benchmark](https://github.com/abeimler/ecs_benchmark).

## Development

```sh
pnpm install
pnpm build      # bundle to dist/ with tsup
pnpm test       # jest
pnpm test:bun   # same tests under bun
pnpm lint

# benchmarks (requires bun)
bun run benchmarks/bench.ts && bun run benchmarks/format.ts
```

## License

MIT
