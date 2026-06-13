const MOUSE_BUTTONS = [
    "mouse/left",
    "mouse/right",
    "mouse/middle",
    "mouse/back",
    "mouse/forward",
] as const satisfies `mouse/${string}`[];

const MOUSE_REL = [
    "mouse/delta",
    "mouse/wheel",
] as const satisfies `mouse/${string}`[];

const MOUSE_ABS = [
    "mouse/pos",
] as const satisfies `mouse/${string}`[];

export type MouseButton = (typeof MOUSE_BUTTONS)[number];
export type MouseInput = (typeof MOUSE_REL)[number] | (typeof MOUSE_ABS)[number];
