
export const TRANSFORM_VERSION_MANAGER_SYMBOL: unique symbol = Symbol("versionManager");


export class GameObjVersionManager {
    /** tree index */
    ti = 0;
    /** tree version previous */
    tvp = Number.MIN_SAFE_INTEGER;
    /** tree version next */
    tvn = Number.MIN_SAFE_INTEGER;
}

export const resetTreeIndex = (tvm: GameObjVersionManager) => {
    tvm.ti = 0;
}

export const nextTreeIndex = (tvm: GameObjVersionManager) => {
    return tvm.ti++;
}

export const nextTransformVersion = (tvm: GameObjVersionManager) => {
    return tvm.tvn++;
}

export const updateLastTransformVersion = (tvm: GameObjVersionManager) => {
    return tvm.tvp = tvm.tvn;
}

export const transformNeedsUpdate = (tvm: GameObjVersionManager, version: number) => {
    return version >= tvm.tvn;
}
