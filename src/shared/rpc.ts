interface RpcCall {
    type: 'rpc-call';
    id: string | null;
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

export function isRpcCall(msg: unknown): msg is RpcCall {
    return (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as RpcCall).type === 'rpc-call'
    );
}

export interface Webview {
    postMessage(message: unknown): Thenable<boolean>;
    onDidReceiveMessage(listener: (e: unknown) => void): { dispose(): void };
}

export function exposeApi<T extends object>(webview: Webview, impl: T): { dispose(): void } {
    return webview.onDidReceiveMessage(async (msg: unknown) => {
        if (!isRpcCall(msg)) {return;}

        const { id, method, args } = msg;

        if (!(method in impl)) {
            if (id) {
                webview.postMessage({
                    type: 'rpc-error',
                    id,
                    error: `Method "${method}" not found`,
                } as RpcError);
            }
            return;
        }

        try {
            const fn = (impl as Record<string, unknown>)[method];
            if (typeof fn !== 'function') {
                throw new Error(`"${method}" is not a function`);
            }
            const result = await fn.apply(impl, args);
            if (id) {
                webview.postMessage({
                    type: 'rpc-result',
                    id,
                    result,
                } as RpcResult);
            }
        } catch (error) {
            if (id) {
                webview.postMessage({
                    type: 'rpc-error',
                    id,
                    error: error instanceof Error ? error.message : String(error),
                } as RpcError);
            }
        }
    });
}
