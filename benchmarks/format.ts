/**
 * Read benchmarks/results.json and emit BENCHMARKS.md in the same per-benchmark
 * table layout as abeimler/ecs_benchmark.
 */
import { readFileSync, writeFileSync } from 'node:fs';

type Sample = { entities: number; medianNs: number; iters: number };
type BenchResult = { name: string; description: string; samples: Sample[] };
type Run = {
    runtime: string;
    platform: string;
    date: string;
    results: BenchResult[];
};

const data: Run = JSON.parse(
    readFileSync(new URL('./results.json', import.meta.url), 'utf8')
);

const fmtTime = (ns: number): string => {
    if (ns < 1_000) return `${ns.toFixed(0)}ns`;
    if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}us`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
    return `${(ns / 1_000_000_000).toFixed(2)}s`;
};

const fmtPerEntity = (ns: number, n: number): string => {
    const per = ns / n;
    return fmtTime(per);
};

const fmtCount = (n: number): string => {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
};

const lines: string[] = [];
lines.push('# osecs benchmarks');
lines.push('');
lines.push(
    'Scenarios from [abeimler/ecs_benchmark](https://github.com/abeimler/ecs_benchmark) ported to osecs.'
);
lines.push(
    'Each row reports the **median** wall time of one operation at the given entity count, plus the per-entity cost. Lower is faster.'
);
lines.push('');
lines.push('### Environment');
lines.push('');
lines.push(`- Date: \`${data.date}\``);
lines.push(`- Runtime: \`${data.runtime}\``);
lines.push(`- Platform: \`${data.platform}\``);
lines.push(`- CPU: AMD Ryzen 7 8700F (8-core)`);
lines.push('');
lines.push(
    'Reproduce with `bun run benchmarks/bench.ts && bun run benchmarks/format.ts`.'
);
lines.push('');

for (const result of data.results) {
    lines.push(`## ${result.name}`);
    lines.push('');
    lines.push(result.description);
    lines.push('');
    lines.push('| Entities | osecs (total) | osecs (per entity) |');
    lines.push('|---------:|--------------:|-------------------:|');
    for (const s of result.samples) {
        lines.push(
            `| ${fmtCount(s.entities)} | ${fmtTime(
                s.medianNs
            )} | ${fmtPerEntity(s.medianNs, s.entities)} |`
        );
    }
    lines.push('');
}

writeFileSync(
    new URL('../BENCHMARKS.md', import.meta.url),
    lines.join('\n') + '\n'
);
process.stderr.write('Wrote BENCHMARKS.md\n');
