/**
 * Compare benchmarks/baseline.json against benchmarks/results.json.
 * Prints per-benchmark per-N percentage delta (negative = faster).
 */
import { readFileSync } from 'node:fs';

type Sample = { entities: number; medianNs: number; iters: number };
type BenchResult = { name: string; description: string; samples: Sample[] };
type Run = { results: BenchResult[] };

const base: Run = JSON.parse(
    readFileSync(new URL('./baseline.json', import.meta.url), 'utf8')
);
const cur: Run = JSON.parse(
    readFileSync(new URL('./results.json', import.meta.url), 'utf8')
);

const fmt = (ns: number) => {
    if (ns < 1_000) return `${ns.toFixed(0)}ns`;
    if (ns < 1_000_000) return `${(ns / 1_000).toFixed(1)}us`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
    return `${(ns / 1_000_000_000).toFixed(2)}s`;
};

const pad = (s: string, n: number) => s.padStart(n);

let totalBase = 0;
let totalCur = 0;

for (const b of cur.results) {
    const baseB = base.results.find((x) => x.name === b.name);
    if (!baseB) continue;
    process.stdout.write(`\n## ${b.name}\n`);
    process.stdout.write(
        `${pad('N', 8)} ${pad('baseline', 12)} ${pad('current', 12)} ${pad(
            'delta',
            8
        )}\n`
    );
    for (const s of b.samples) {
        const bs = baseB.samples.find((x) => x.entities === s.entities);
        if (!bs) continue;
        const delta = (s.medianNs - bs.medianNs) / bs.medianNs;
        const sign = delta < 0 ? '' : '+';
        const tag =
            delta < -0.1 ? ' faster' : delta > 0.1 ? ' SLOWER' : '';
        process.stdout.write(
            `${pad(String(s.entities), 8)} ${pad(
                fmt(bs.medianNs),
                12
            )} ${pad(fmt(s.medianNs), 12)} ${pad(
                `${sign}${(delta * 100).toFixed(1)}%`,
                8
            )}${tag}\n`
        );
        totalBase += bs.medianNs;
        totalCur += s.medianNs;
    }
}

const overall = (totalCur - totalBase) / totalBase;
process.stdout.write(
    `\nOverall (sum of medians): ${fmt(totalBase)} -> ${fmt(totalCur)}  (${
        overall < 0 ? '' : '+'
    }${(overall * 100).toFixed(1)}%)\n`
);
