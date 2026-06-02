import { Quad } from "@r47onfire/game-math";
import { StringMatrix, Tuple } from "../utils/types";
import { RenderModifiers } from "./RenderModifiers";

export type VertexTransform<F extends string[]> = (
    data: Tuple<number, F["length"]>,
    mod: Readonly<RenderModifiers>,
    quad: Readonly<Quad>,
) => void;

export class VertexParameter<const F extends string[]> {
    constructor(
        /** The name of the `in xxx` parameter in the vertex shader */
        public attr: string,
        /** The name of the fields in the vertex, also determines the size (1=`float`, 2=`vec2`, 3=`vec3`, etc) */
        public fields: F,
        /** The value to fill with if the field is not found. Default is 0. */
        public fill?: number | Tuple<number, F["length"]>,
        /** Transforms the value before it gets added to the queue. The data parameter is an inout parameter, should be modified in place. */
        public transform?: VertexTransform<F>) { }
}

export type VertexFormat<F extends StringMatrix> =
    readonly [...{ [K in keyof F]: VertexParameter<F[K]> }];
export type Vertex<F extends StringMatrix> =
    Partial<Record<F[number][number], number>>;
