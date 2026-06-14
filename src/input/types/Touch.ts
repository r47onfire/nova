export const TOUCH_POS = [
    "touch/pos0",
    "touch/pos1",
    "touch/pos2",
] as const satisfies `touch/${string}`[];

export const TOUCH_DELTA = [
    "touch/delta0",
    "touch/delta1",
    "touch/delta2",
] as const satisfies `touch/${string}`[];

export const TOUCH_DOWN = [
    "touch/tap0",
    "touch/tap1",
    "touch/tap2",
] as const satisfies `touch/${string}`[];

export type TouchPosInput = (typeof TOUCH_POS)[number] | (typeof TOUCH_DELTA)[number];
export type TouchInput = (typeof TOUCH_DOWN)[number];
