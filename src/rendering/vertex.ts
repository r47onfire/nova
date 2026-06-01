import { Quad } from "@r47onfire/game-math";
import { Mesh } from "./meshes/Mesh";

export interface Vertex {
    [field: string]: number;
}

type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>;

export interface VertexParameter<N extends number> {
    /** The name of the `in xxx` parameter in the vertex shader */
    attr: string;
    /** The name of the fields in the vertex, also determines the size (1=`float`, 2=`vec2`, 3=`vec3`, etc) */
    fields: Tuple<string, N>;
    /** The value to fill with if the field is not found. Default is 0. */
    fill?: number | Tuple<number, N>;
    /** Transforms the value before it gets added to the queue. The data parameter is an inout parameter, should be modified in place. */
    transform?(this: void, mesh: Readonly<Mesh>, quad: Readonly<Quad>, data: Tuple<number, N>): void;
}

export type VertexFormat = (VertexParameter<1> | VertexParameter<2> | VertexParameter<3> | VertexParameter<4>)[];
