import { Renderer } from "../../rendering/Renderer";

export type GameObjEvents = {
    /** Triggered every frame while the object is unpaused, value is dt */
    update: number;
    /** Triggered every frame while the object is not hidden */
    draw: Renderer;
    /** Triggered every frame while the object is not hidden and inspect mode is on */
    drawInspect: Renderer;
    /** Triggered when object is added */
    add: void;
    /** Triggered when object is destroyed */
    destroy: void;
    /** Triggered when component is used */
    use: string;
    /** Triggered when component is unused */
    unuse: string;
    /** Triggered when tag is added */
    tag: string;
    /** Triggered when tag is removed */
    untag: string;
    /**
     * Triggered when the object starts ticking,
     * either from being directly unpaused or a parent being unpaused
     */
    unpause: void;
    /**
     * Triggered when the object stops ticking,
     * either from being directly paused or a parent being paused
     */
    pause: void;
    /**
     * Triggered when the object stops drawing,
     * either from being directly hidden or a parent being hidden
     */
    hide: void;
    /**
     * Triggered when the object starts drawing,
     * either from being directly unhidden or a parent being unhidden
     */
    show: void;
};
