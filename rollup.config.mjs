import buildTS from 'rollup-plugin-ts';
import builtins from 'rollup-plugin-node-builtins';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'lib/index.js',
                format: 'esm',
                sourcemap: true
            },
            {
                file: 'lib/index.umd.js',
                name: 'osecs',
                format: 'umd',
                sourcemap: true
            }
        ],
        plugins: [builtins(), buildTS()]
    }
];
