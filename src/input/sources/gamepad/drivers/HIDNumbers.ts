export enum HIDAssignedNumber {
    VID_MICROSOFT = 0x045e,
    VID_SONY = 0x054c,
    PID_DUALSHOCK_4_A = 0x09cc,
    PID_DUALSHOCK_4_B = 0x05c4,
    PID_DUALSENSE = 0x0ce6,
    PID_DUALSENSE_EDGE = 0x0df2,
    VID_NINTENDO = 0x057e,
    PID_JOYCON_BOTH = 0x200e,
    PID_SWITCH_PRO_CONTROLLER = 0x2009,
    PID_LEFT_JOYCON = 0x2006,
    PID_RIGHT_JOYCON = 0x2007,
    VID_VALVE = 0x28DE,
    PID_STEAM_DECK_EMBEDDED = 0x1205,
    PID_STEAM_CONTROLLER_2026_USB = 0x1302,
    PID_STEAM_CONTROLLER_2026_BLUETOOTH = 0x1303,
    PID_STEAM_CONTROLLER_2026_PUCK = 0x1304,
    PID_STEAM_CONTROLLER_2026_NEREID = 0x1305,
}

export const extractVidPid = (id: string): [vid: number, pid: number] | null => {
    const match = id.match(/vendor:\s*([0-9a-f]{1,4})\D+product:\s*([0-9a-f]{1,4})/) ?? id.match(/^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i);
    if (!match) return null;
    return [parseInt(match[1]!, 16), parseInt(match[2]!, 16)];
};
