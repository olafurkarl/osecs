/**
 * Port of the abeimler/ecs_benchmark scenarios to osecs.
 * Run with `bun run benchmarks/bench.ts` (writes results to benchmarks/results.json).
 */
import {
    Component,
    Has,
    RegisterComponent,
    System,
    World
} from '../src/index';

@RegisterComponent
class PositionComponent extends Component {
    x = 0;
    y = 0;
}

@RegisterComponent
class DirectionComponent extends Component {
    x = 1;
    y = 1;
}

@RegisterComponent
class ComflabulationComponent extends Component {
    thingy = 0;
    dingy = 0;
    mingy = false;
    stringy = '';
}

@RegisterComponent
class HealthComponent extends Component {
    hp = 100;
    maxHp = 100;
}

@RegisterComponent
class DamageComponent extends Component {
    dmg = 1;
}

@RegisterComponent
class SpriteComponent extends Component {
    sprite = 'x';
}

@RegisterComponent
class LifetimeComponent extends Component {
    ttl = 10;
}

class MovementSystem extends System {
    private q = this.query([
        Has(PositionComponent),
        Has(DirectionComponent)
    ]);
    run(delta: number) {
        this.q.forEach((e) => {
            const p = e.get(PositionComponent);
            const d = e.get(DirectionComponent);
            p.x += d.x * delta;
            p.y += d.y * delta;
        });
    }
}

class DataSystem extends System {
    private q = this.query([Has(ComflabulationComponent)]);
    run(delta: number) {
        this.q.forEach((e) => {
            const c = e.get(ComflabulationComponent);
            c.thingy += delta;
            c.dingy += 1;
            c.mingy = !c.mingy;
        });
    }
}

class HealthSystem extends System {
    private q = this.query([Has(HealthComponent)]);
    run(delta: number) {
        this.q.forEach((e) => {
            const h = e.get(HealthComponent);
            if (h.hp < h.maxHp) {
                h.hp = Math.min(h.maxHp, h.hp + delta);
            }
        });
    }
}

class DamageSystem extends System {
    private q = this.query([Has(HealthComponent), Has(DamageComponent)]);
    run() {
        this.q.forEach((e) => {
            const h = e.get(HealthComponent);
            const d = e.get(DamageComponent);
            h.hp -= d.dmg;
        });
    }
}

class SpriteSystem extends System {
    private q = this.query([Has(SpriteComponent), Has(PositionComponent)]);
    run() {
        let sink = 0;
        this.q.forEach((e) => {
            const s = e.get(SpriteComponent);
            const p = e.get(PositionComponent);
            sink += s.sprite.length + p.x;
        });
        // prevent dead-code elimination
        (globalThis as any).__sink = sink;
    }
}

class LifetimeSystem extends System {
    private q = this.query([Has(LifetimeComponent)]);
    run(delta: number) {
        this.q.forEach((e) => {
            const l = e.get(LifetimeComponent);
            l.ttl -= delta;
        });
    }
}

class CollisionSystem extends System {
    private q = this.query([Has(PositionComponent), Has(HealthComponent)]);
    run() {
        let close = 0;
        this.q.forEach((e) => {
            const p = e.get(PositionComponent);
            if (Math.abs(p.x) + Math.abs(p.y) < 1) close++;
        });
        (globalThis as any).__close = close;
    }
}

const ENTITY_COUNTS = [1, 4, 8, 16, 32, 64, 256, 1024, 4096, 16384, 65536];
// Tier of "expensive" benchmarks gets a smaller cap so the suite finishes.
const HEAVY_CAP = 65536;

const iterations = (n: number): number => {
    if (n <= 16) return 500;
    if (n <= 64) return 200;
    if (n <= 256) return 100;
    if (n <= 1024) return 40;
    if (n <= 4096) return 15;
    if (n <= 16384) return 6;
    if (n <= 65536) return 3;
    return 2;
};

const now = () => process.hrtime.bigint();
const nsBetween = (a: bigint, b: bigint) => Number(b - a);

type Sample = { entities: number; medianNs: number; iters: number };
type BenchResult = { name: string; description: string; samples: Sample[] };

const median = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function spawnBasic(world: World, n: number) {
    for (let i = 0; i < n; i++) {
        world
            .spawnEntity()
            .with(PositionComponent)
            .with(DirectionComponent)
            .with(ComflabulationComponent)
            .build();
    }
}

function spawnMixed(world: World, n: number) {
    for (let i = 0; i < n; i++) {
        const b = world.spawnEntity().with(PositionComponent);
        // 33%: + Direction (movers)
        // 33%: + Direction + Health (durable movers)
        // 33%: + Direction + Health + Damage + Comflabulation (full)
        b.with(DirectionComponent);
        if (i % 3 !== 0) b.with(HealthComponent);
        if (i % 3 === 2) {
            b.with(DamageComponent);
            b.with(ComflabulationComponent);
        }
        b.build();
    }
}

const benchmarks: Array<{
    name: string;
    description: string;
    cap?: number;
    fn: (n: number) => number;
}> = [
    {
        name: 'CreateEntities',
        description:
            'Time to create N entities, each with 3 components (Position, Direction, Comflabulation).',
        fn: (n) => {
            const world = World.create();
            const t0 = now();
            spawnBasic(world, n);
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'DestroyEntities',
        description:
            'Time to destroy N pre-created entities (includes graveyard processing on world.run).',
        fn: (n) => {
            const world = World.create();
            spawnBasic(world, n);
            const ents = Array.from((world as any).entities.values()) as any[];
            const t0 = now();
            for (const e of ents) e.destroy();
            // Two runs: first queues entitiesToBePurged, second actually purges.
            world.run();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'UnpackOneComponent',
        description:
            'Iterate N entities once and read one component per entity.',
        fn: (n) => {
            const world = World.create().addSystem(DataSystem);
            spawnBasic(world, n);
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'UnpackTwoComponents',
        description:
            'Iterate N entities once and read two components per entity.',
        fn: (n) => {
            const world = World.create().addSystem(MovementSystem);
            spawnBasic(world, n);
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'UnpackThreeComponents',
        description:
            'Iterate N entities once and read three components per entity.',
        fn: (n) => {
            class ThreeSystem extends System {
                private q = this.query([
                    Has(PositionComponent),
                    Has(DirectionComponent),
                    Has(ComflabulationComponent)
                ]);
                run() {
                    this.q.forEach((e) => {
                        const p = e.get(PositionComponent);
                        const d = e.get(DirectionComponent);
                        const c = e.get(ComflabulationComponent);
                        p.x += d.x;
                        p.y += d.y;
                        c.thingy += 1;
                    });
                }
            }
            const world = World.create().addSystem(ThreeSystem);
            spawnBasic(world, n);
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'RemoveAddComponent',
        cap: 16384,
        description:
            'For each of N entities, remove and re-add a component (then flush via world.run).',
        fn: (n) => {
            const world = World.create();
            spawnBasic(world, n);
            const ents = Array.from((world as any).entities.values()) as any[];
            const t0 = now();
            for (const e of ents) {
                e.removeComponent(ComflabulationComponent);
                e.addComponent(ComflabulationComponent);
            }
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'SystemsUpdate',
        description:
            'One world.run with two systems (Movement + Data) on N homogeneous entities.',
        fn: (n) => {
            const world = World.create()
                .addSystem(MovementSystem)
                .addSystem(DataSystem);
            spawnBasic(world, n);
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'SystemsUpdateMixedEntities',
        description:
            'One world.run with two systems on N heterogeneous entities (mixed component sets).',
        fn: (n) => {
            const world = World.create()
                .addSystem(MovementSystem)
                .addSystem(DataSystem);
            spawnMixed(world, n);
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'ComplexSystemsUpdate',
        cap: HEAVY_CAP,
        description:
            'One world.run with seven systems (Movement, Data, Health, Damage, Sprite, Lifetime, Collision) on N homogeneous entities.',
        fn: (n) => {
            const world = World.create()
                .addSystem(MovementSystem)
                .addSystem(DataSystem)
                .addSystem(HealthSystem)
                .addSystem(DamageSystem)
                .addSystem(SpriteSystem)
                .addSystem(LifetimeSystem)
                .addSystem(CollisionSystem);
            for (let i = 0; i < n; i++) {
                world
                    .spawnEntity()
                    .with(PositionComponent)
                    .with(DirectionComponent)
                    .with(ComflabulationComponent)
                    .with(HealthComponent)
                    .with(DamageComponent)
                    .with(SpriteComponent)
                    .with(LifetimeComponent)
                    .build();
            }
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    },
    {
        name: 'ComplexSystemsUpdateMixedEntities',
        cap: HEAVY_CAP,
        description:
            'One world.run with seven systems on N heterogeneous entities.',
        fn: (n) => {
            const world = World.create()
                .addSystem(MovementSystem)
                .addSystem(DataSystem)
                .addSystem(HealthSystem)
                .addSystem(DamageSystem)
                .addSystem(SpriteSystem)
                .addSystem(LifetimeSystem)
                .addSystem(CollisionSystem);
            for (let i = 0; i < n; i++) {
                const b = world
                    .spawnEntity()
                    .with(PositionComponent)
                    .with(DirectionComponent);
                if (i % 2 === 0) b.with(HealthComponent);
                if (i % 3 === 0) b.with(DamageComponent);
                if (i % 4 === 0) b.with(ComflabulationComponent);
                if (i % 5 === 0) b.with(SpriteComponent);
                if (i % 6 === 0) b.with(LifetimeComponent);
                b.build();
            }
            world.run();
            const t0 = now();
            world.run();
            const t1 = now();
            world.destroy();
            return nsBetween(t0, t1);
        }
    }
];

function runOne(bench: (typeof benchmarks)[number]): BenchResult {
    const samples: Sample[] = [];
    process.stderr.write(`\n## ${bench.name}\n`);
    const cap = bench.cap ?? Infinity;
    for (const n of ENTITY_COUNTS) {
        if (n > cap) break;
        const iters = iterations(n);
        const measurements: number[] = [];
        // 1 warmup
        try {
            bench.fn(n);
        } catch (err) {
            process.stderr.write(`  ${n}: ERROR ${(err as Error).message}\n`);
            break;
        }
        for (let i = 0; i < iters; i++) {
            measurements.push(bench.fn(n));
        }
        const med = median(measurements);
        samples.push({ entities: n, medianNs: med, iters });
        process.stderr.write(
            `  n=${n} iters=${iters} median=${formatNs(med)}\n`
        );
        // soft time guard: stop scaling if a single sample exceeds 5s
        if (med > 5_000_000_000) break;
    }
    return { name: bench.name, description: bench.description, samples };
}

function formatNs(ns: number): string {
    if (ns < 1_000) return `${ns.toFixed(0)}ns`;
    if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}us`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
    return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

const results: BenchResult[] = [];
const overallStart = Date.now();
for (const b of benchmarks) {
    results.push(runOne(b));
}
const totalSecs = ((Date.now() - overallStart) / 1000).toFixed(1);
process.stderr.write(`\nTotal time: ${totalSecs}s\n`);

const out = {
    runtime: `node ${process.versions.node ?? ''} / bun ${
        (process.versions as any).bun ?? 'n/a'
    }`,
    platform: `${process.platform} ${process.arch}`,
    date: new Date().toISOString(),
    results
};

import { writeFileSync } from 'node:fs';
writeFileSync(
    new URL('./results.json', import.meta.url),
    JSON.stringify(out, null, 2)
);
process.stderr.write(`Wrote benchmarks/results.json\n`);
