type Callback<V> = (values: V[]) => void;

// simple buffer that buffers items and flushes after a timeout

export class BufferTime<V> {
    callback: Callback<V>;
    buffer: V[] = [];
    time = 0;
    timerId = -1;

    constructor(callback: Callback<V>) {
        this.callback = callback;
    }

    push(value: V): void {
        if(this.buffer.length === 0) {
            this.timerId = window.setTimeout(() => this.flush(), this.time);
        }
        this.buffer.push(value);
    }

    flush(): void {
        window.clearTimeout(this.timerId);
        this.callback(this.buffer);
        this.buffer = [];
    }
}
