import { Component } from './component';

export class Mask {
    private _mask: Uint32Array;
    private _enabled = false;

    constructor(size = Component.maxId) {
        // Uint32Array holds 32 bits for every unit of size, so we need the no. of components
        // divided by 32 to mask all components
        this._mask = new Uint32Array(Math.ceil(size / 32));
    }

    enable(): void {
        this._enabled = true;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get mask(): Uint32Array {
        return this._mask;
    }

    get empty(): boolean {
        for (let i = 0; i < this._mask.length; i++) {
            if (this._mask[i] !== 0) return false;
        }
        return true;
    }

    /**
     * Checks another mask to see it is fulfilled by the flags in this mask
     * @param otherMask Uint32Array to be compared with this mask
     * @returns True if the provided mask is satisfied by this mask
     */
    fulfills(otherMask: Mask): boolean {
        const other = otherMask.mask;
        const mine = this._mask;
        if (other.length !== mine.length) {
            throw new Error('Comparing masks of different sizes not allowed.');
        }
        for (let i = 0; i < mine.length; i++) {
            if (!this.checkMask(mine[i], other[i])) return false;
        }
        return true;
    }

    /**
     * Checks another mask to see it contains all flags in this mask
     * @param otherMask Uint32Array to be compared with this mask
     * @returns True if the provided mask is satisfied by this mask
     */
    fulfilledBy(otherMask: Mask): boolean {
        const other = otherMask.mask;
        const mine = this._mask;
        if (other.length !== mine.length) {
            throw new Error('Comparing masks of different sizes not allowed.');
        }
        for (let i = 0; i < mine.length; i++) {
            if (!this.checkMask(other[i], mine[i])) return false;
        }
        return true;
    }

    /**
     * @param checkingMask The mask that needs to be met to fulfill the condition
     * @param requiredMask The other mask that needs to match up with the first mask
     * @returns Whether the masks match or not
     */
    private checkMask(checkingMask: number, requiredMask: number): boolean {
        return (
            (checkingMask & requiredMask) >>> 0 === requiredMask ||
            checkingMask === requiredMask // second condition checking if they're both 0
        );
    }

    /**
     * Flips all bits in the mask to 1
     */
    flipAllToOne(): void {
        this._mask.fill(~0 >>> 0);
    }

    /**
     * Flip on a flag in this mask
     * @param bitPosition The bit flag to flip, typically a componentId.
     */
    flipOn(bitPosition: number): void {
        this._mask[Math.floor(bitPosition / 32)] |=
            (1 << bitPosition % 32) >>> 0;
    }

    /**
     * Flip off a flag on this mask
     * @param bitPosition The bit flag to flip, typically a componentId.
     */
    flipOff(bitPosition: number): void {
        this._mask[Math.floor(bitPosition / 32)] &= ~(
            (1 << bitPosition % 32) >>>
            0
        );
    }

    toString(): string {
        const decToBin = (dec: number) => {
            return (dec >>> 0).toString(2);
        };
        let string = '|';
        for (const mask of this.mask) {
            const stringMask = decToBin(mask);
            string += stringMask.padEnd(32, '0');
            string += '|';
        }
        return string;
    }

    get maskString() {
        return this.toString();
    }
}
