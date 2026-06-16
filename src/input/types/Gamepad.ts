export const GAMEPAD_BUTTONS = [
    "gamepad/north",
    "gamepad/east",
    "gamepad/south",
    "gamepad/west",
    "gamepad/ltrigger",
    "gamepad/rtrigger",
    "gamepad/lshoulder",
    "gamepad/rshoulder",
    "gamepad/select",
    "gamepad/start",
    "gamepad/lstick",
    "gamepad/rstick",
    "gamepad/dpad-up",
    "gamepad/dpad-right",
    "gamepad/dpad-down",
    "gamepad/dpad-left",
    "gamepad/home",
    "gamepad/capture",
    "gamepad/touchpad"
] as const satisfies `gamepad/${string}`[];

export const GAMEPAD_STICKS = [
    "gamepad/left",
    "gamepad/right",
    "gamepad/touch_delta0",
    "gamepad/touch_delta1",
] as const satisfies `gamepad/${string}`[];

export const GAMEPAD_ABS = [
    "gamepad/touch_finger0",
    "gamepad/touch_finger1",
] as const satisfies `gamepad/${string}`[];

type OrWithIndex<T extends string> = T | `${T}:${number}`;

export type GamepadButton = OrWithIndex<(typeof GAMEPAD_BUTTONS)[number]>;
export type GamepadStick = OrWithIndex<(typeof GAMEPAD_STICKS)[number] | (typeof GAMEPAD_ABS)[number]>;
