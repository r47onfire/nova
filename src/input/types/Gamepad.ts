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
] as const satisfies `gamepad/${string}`[];

export type GamepadButton = (typeof GAMEPAD_BUTTONS)[number];
export type GamepadStick = (typeof GAMEPAD_STICKS)[number];
