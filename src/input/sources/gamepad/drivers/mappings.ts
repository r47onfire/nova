import { GamepadMapping, GamepadType } from "../GamepadSource";
import { HIDAssignedNumber } from "./HIDNumbers";


export const DEFAULT_MAPPING: GamepadMapping = {
    vidPid: [0],
    names: [],
    name: "Standard Gamepad",
    type: GamepadType.UNKNOWN,
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

export const DUALSENSE_MAPPING: GamepadMapping = {
    vidPid: [HIDAssignedNumber.VID_SONY, [HIDAssignedNumber.PID_DUALSENSE]],
    names: ["dualsense"],
    type: GamepadType.PS5,
    name: "DualSense",
    buttons: {
        ...DEFAULT_MAPPING.buttons,
        17: "touchpad"
    },
    sticks: DEFAULT_MAPPING.sticks
}

export const KNOWN_NON_DEFAULT_MAPPINGS: GamepadMapping[] = [
    {
        vidPid: [HIDAssignedNumber.VID_NINTENDO, [HIDAssignedNumber.PID_JOYCON_BOTH]],
        names: ["joy-con l+r"],
        type: GamepadType.NINTENDO,
        name: "Joy-Con (L+R)",
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "capture"
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_MICROSOFT],
        names: ["xbox"],
        type: GamepadType.XBOX,
        name: "Xbox Controller",
        buttons: DEFAULT_MAPPING.buttons,
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_VALVE, [HIDAssignedNumber.PID_STEAM_DECK_EMBEDDED]],
        names: ["steam"],
        type: GamepadType.STEAM,
        name: "Steam Deck",
        buttons: DEFAULT_MAPPING.buttons, // ???? there is probably more!
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_VALVE, [HIDAssignedNumber.PID_STEAM_CONTROLLER_2026_PUCK]],
        names: ["steam"],
        type: GamepadType.STEAM,
        name: "Steam Controller (2026)",
        buttons: DEFAULT_MAPPING.buttons, // ???? there is probably more!
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_VALVE],
        names: ["steam"],
        type: GamepadType.STEAM,
        name: "Steam Controller",
        buttons: DEFAULT_MAPPING.buttons, // ???? there is probably more!
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_NINTENDO, [HIDAssignedNumber.PID_SWITCH_PRO_CONTROLLER]],
        names: ["pro controller"],
        type: GamepadType.NINTENDO,
        name: "Switch Pro Controller",
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "capture"
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_SONY, [HIDAssignedNumber.PID_DUALSENSE_EDGE]],
        names: ["dualsense edge"],
        type: GamepadType.PS5,
        name: "DualSense Edge",
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "touchpad",
            // ??? there may be more?
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    DUALSENSE_MAPPING,
    {
        vidPid: [HIDAssignedNumber.VID_SONY, [HIDAssignedNumber.PID_DUALSHOCK_4_A, HIDAssignedNumber.PID_DUALSHOCK_4_B]],
        names: [],
        type: GamepadType.PS4,
        name: "DualShock 4",
        buttons: {
            ...DEFAULT_MAPPING.buttons,
            17: "touchpad"
        },
        sticks: DEFAULT_MAPPING.sticks
    },
    {
        vidPid: [HIDAssignedNumber.VID_NINTENDO, [HIDAssignedNumber.PID_LEFT_JOYCON]],
        names: ["joy-con (l)"],
        type: GamepadType.NINTENDO,
        name: "Joy-Con (L)",
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
    {
        vidPid: [HIDAssignedNumber.VID_NINTENDO, [HIDAssignedNumber.PID_RIGHT_JOYCON]],
        names: ["joy-con (r)"],
        type: GamepadType.NINTENDO,
        name: "Joy-Con (R)",
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
];
