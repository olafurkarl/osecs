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
        return this._mask.every((m) => m === 0);
    }

    /**
     * Checks another mask to see it is fulfilled by the flags in this mask
     * @param otherMask Uint32Array to be compared with this mask
     * @returns True if the provided mask is satisfied by this mask
     */
    public fulfills = (otherMask: Mask): boolean => {
        if (otherMask.mask.length !== this._mask.length) {
            throw new Error('Comparing masks of different sizes not allowed.');
        }
        return this._mask.every((m, index) =>
            this.checkMask(m, otherMask.mask[index])
        );
    };

    /**
     * Checks another mask to see it contains all flags in this mask
     * @param otherMask Uint32Array to be compared with this mask
     * @returns True if the provided mask is satisfied by this mask
     */
    public fulfilledBy = (otherMask: Mask): boolean => {
        if (otherMask.mask.length !== this._mask.length) {
            throw new Error('Comparing masks of different sizes not allowed.');
        }
        return this._mask.every((m, index) =>
            this.checkMask(otherMask.mask[index], m)
        );
    };

    /**
     * @param checkingMask The mask that needs to be met to fulfill the condition
     * @param requiredMask The other mask that needs to match up with the first mask
     * @returns Whether the masks match or not
     */
    private checkMask = (
        checkingMask: number,
        requiredMask: number
    ): boolean => {
        return (
            (checkingMask & requiredMask) === requiredMask ||
            checkingMask === requiredMask // second condition checking if they're both 0
        );
    };

    /**
     * Flips all bits in the mask to 1
     */
    flipAllToOne = () => {
        for (let i = 0; i < this._mask.length; i += 1) {
            this._mask[0] = ~0 >>> 0; // all bits 1
        }
    };

    /**
     * Flip on a flag in this mask
     * @param bitPosition The bit flag to flip, typically a componentId.
     */
    flipOn = (bitPosition: number) => {
        this._mask[Math.floor(bitPosition / 32)] |= 1 << bitPosition % 32;
    };

    /**
     * Flip off a flag on this mask
     * @param bitPosition The bit flag to flip, typically a componentId.
     */
    flipOff = (bitPosition: number) => {
        this._mask[Math.floor(bitPosition / 32)] &= ~(1 << bitPosition % 32);
    };

    toString(): string {
        const decToBin = (dec: number) => {
            return (dec >>> 0).toString(2);
        };
        let string = '';
        this.mask.forEach((m) => {
            string = decToBin(m) + string;
        });
        return string;
    }

    get maskString() {
        return this.toString();
    }
}
