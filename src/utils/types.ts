type Defined<T> = T extends any ? Pick<T, {
    [K in keyof T]-?: T[K] extends undefined ? never : K;
}[keyof T]> : never;
export type MergeObject<T> = Expand<UnionToIntersection<Defined<T>>>;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type Expand<T> = T extends infer U ? {
    [K in keyof U]: U[K];
} : never;
export type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>;

export type StringMatrix = string[][];
