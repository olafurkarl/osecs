import { Mask } from '../src/mask';

describe('Mask', () => {
    it('empty returns correctly', () => {
        const mask = new Mask(64);
        mask.flipAllToOne();
        for (let i = 0; i < 64; i += 1) {
            mask.flipOff(i);
        }
        expect(mask.empty).toEqual(true);

        mask.flipOn(42);
        expect(mask.empty).toEqual(false);
    });
    it('correctly flips the correct bit when flipping on', () => {
        const mask = new Mask(1);
        const expectedMask = new Uint32Array(1);
        expectedMask[0] = 1;
        mask.flipOn(0);
        expect(mask.mask).toEqual(expectedMask);
    });
    it('correctly flips the correct bit when flipping off', () => {
        const mask = new Mask(1);
        const expectedMask = new Uint32Array(1);
        expectedMask[0] = (~0 >>> 0) << 1; // 11111111111111111111111111111110
        mask.flipAllToOne();
        mask.flipOff(0);
        expect(mask.mask[0]).toEqual(expectedMask[0]);
    });
    it('compare 2 simple masks, both include', () => {
        const mask = new Mask(1);
        const mask2 = new Mask(1);

        mask.flipOn(1);
        mask2.flipOn(1);
        expect(mask.fulfills(mask2)).toEqual(true);
    });
    it('compare 2 simple masks, one excludes', () => {
        const mask = new Mask(1);
        const mask2 = new Mask(1);

        mask.flipOn(1);
        mask2.flipAllToOne();
        mask2.flipOff(1);
        expect(mask.fulfills(mask2)).toEqual(false);
        expect(mask.fulfilledBy(mask2)).toEqual(false);
    });
    it('compare 2 large masks, both include', () => {
        const mask = new Mask(513);
        const mask2 = new Mask(513);

        mask.flipOn(77);
        mask2.flipOn(77);
        expect(mask.fulfills(mask2)).toEqual(true);
        expect(mask.fulfilledBy(mask2)).toEqual(true);
    });
    it('compare 2 large masks, one excludes', () => {
        const mask = new Mask(513);
        const mask2 = new Mask(513);

        mask.flipOn(77);

        mask2.flipAllToOne();
        mask2.flipOff(77);

        expect(mask.fulfills(mask2)).toEqual(false);
        expect(mask.fulfilledBy(mask2)).toEqual(false);
        expect(mask2.fulfilledBy(mask)).toEqual(false);
    });

    it('compare 2 large masks, multiple flips', () => {
        const mask = new Mask(513);
        const mask2 = new Mask(513);

        mask.flipOn(12);
        mask.flipOn(43);
        mask.flipOn(77);

        mask2.flipOn(43);
        mask2.flipOn(77);

        expect(mask.fulfilledBy(mask2)).toEqual(false);
        expect(mask.fulfills(mask2)).toEqual(true);
    });
});

export {};
