interface RpcCall {
    type: 'rpc-call';
    id: string;
    method: string;
    args: unknown[];
}

interface RpcResult {
    type: 'rpc-result';
    id: string;
    result: unknown;
}

interface RpcError {
    type: 'rpc-error';
    id: string;
    error: string;
}

type RpcResponse = RpcResult | RpcError;

function isRpcResult(msg: unknown): msg is RpcResult {
    return (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as RpcResult).type === 'rpc-result'
    );
}

function isRpcError(msg: unknown): msg is RpcError {
    return (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as RpcError).type === 'rpc-error'
    );
}

interface VsCodeApi {
    postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeApi: VsCodeApi | null = null;
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
let listenerInitialized = false;

function getVsCodeApi(): VsCodeApi {
    if (!vscodeApi) {
        vscodeApi = acquireVsCodeApi();
    }
    return vscodeApi;
}

function initializeListener() {
    if (listenerInitialized) return;
    listenerInitialized = true;

    window.addEventListener('message', (event: MessageEvent) => {
        const msg = event.data as RpcResponse;

        if (isRpcResult(msg)) {
            const handler = pending.get(msg.id);
            if (handler) {
                handler.resolve(msg.result);
                pending.delete(msg.id);
            }
        } else if (isRpcError(msg)) {
            const handler = pending.get(msg.id);
            if (handler) {
                handler.reject(new Error(msg.error));
                pending.delete(msg.id);
            }
        }
    });
}

function generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createApiClient<T extends object>(): T {
    initializeListener();

    return new Proxy({} as T, {
        get(_target, prop: string) {
            return (...args: unknown[]): Promise<unknown> => {
                const id = generateId();
                const api = getVsCodeApi();

                api.postMessage({
                    type: 'rpc-call',
                    id,
                    method: prop,
                    args,
                } as RpcCall);

                return new Promise((resolve, reject) => {
                    pending.set(id, { resolve, reject });
                });
            };
        },
    }) as T;
}

