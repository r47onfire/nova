// NB: these must be in the same order as MouseEvent.button number is
export const MOUSE_BUTTONS = [
    "mouse/left",
    "mouse/middle",
    "mouse/right",
    "mouse/back",
    "mouse/forward",
] as const satisfies `mouse/${string}`[];

export const MOUSE_REL_MOVE = [
    "mouse/delta",
] as const satisfies `mouse/${string}`[];

export const MOUSE_REL_SCROLL = [
    "mouse/wheel",
] as const satisfies `mouse/${string}`[];

export const MOUSE_ABS = [
    "mouse/pos",
] as const satisfies `mouse/${string}`[];

export type MouseButton = (typeof MOUSE_BUTTONS)[number];
export type MouseInput = (typeof MOUSE_REL_MOVE)[number] | (typeof MOUSE_REL_SCROLL)[number] | (typeof MOUSE_ABS)[number];
