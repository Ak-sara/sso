export type AnchorType =
    | 'parent_in'  | 'parent_out'
    | 'shadow_in'  | 'shadow_out'
    | 'neck_out'   | 'l_neck' | 'r_neck';

export interface NodeRef {
    getAnchor(type: AnchorType): [number, number];
}

export const REGISTRY_CTX = Symbol('node-registry');

export interface Registry {
    register(key: string, ref: NodeRef): void;
    unregister(key: string): void;
    get(key: string): NodeRef | undefined;
}
