import { GamepadMapping } from "../GamepadSource";


export const DEFAULT_MAPPING: GamepadMapping = {
    buttons: {
        0: "south",
        1: "east",
        2: "west",
        3: "north",
        4: "lshoulder",
        5: "rshoulder",
        6: "ltrigger",
        7: "rtrigger",
        8: "select",
        9: "start",
        10: "lstick",
        11: "rstick",
        12: "dpad-up",
        13: "dpad-down",
        14: "dpad-left",
        15: "dpad-right",
        16: "home"
    },
    sticks: {
        left: { x: 0, y: 1 },
        right: { x: 2, y: 3 }
    }
};

// This is basically copied from kaplay
// TODO: rewrite this to use regexes or test functions because chrome doesn't include VID/PID anymore in the ID for privacy (kaplayjs/kaplay#1110)

const JOYCON_BOTH_ID = "Joy-Con L+R (STANDARD GAMEPAD Vendor: 057e Product: 200e)";
const JOYCON_LEFT_ID = "Joy-Con (L) (STANDARD GAMEPAD Vendor: 057e Product: 2006)";
const JOYCON_RIGHT_ID = "Joy-Con (R) (STANDARD GAMEPAD Vendor: 057e Product: 2007)";
const SWITCH_PRO_ID = "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)";
export const DS5_ID = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";

export const KNOWN_NON_DEFAULT_MAPPINGS: Record<string, GamepadMapping> = {
    [JOYCON_BOTH_ID]: {
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "capture"
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    [SWITCH_PRO_ID]: {
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "capture"
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    [DS5_ID]: {
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "touchpad"
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    [JOYCON_LEFT_ID]: {
        buttons: {
            0: "south",
            1: "east",
            2: "west",
            3: "north",
            4: "lshoulder",
            5: "rshoulder",
            9: "select",
            10: "lstick",
            16: "start"
        },
        sticks: {
            left: { x: 0, y: 1 }
        }
    },
    [JOYCON_RIGHT_ID]: {
        buttons: {
            0: "south",
            1: "east",
            2: "west",
            3: "north",
            4: "lshoulder",
            5: "rshoulder",
            9: "start",
            10: "lstick",
            16: "select"
        },
        sticks: {
            left: { x: 0, y: 1 }
        }
    },
}
