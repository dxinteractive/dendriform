type Callback<V> = (values: V[]) => void;

export class BufferTime<V> {
    callback: Callback<V>;
    buffer: V[] = [];
    time = 0;

    constructor(callback: Callback<V>) {
        this.callback = callback;
    }

    push(value: V): void {
        if(this.buffer.length === 0) {
            setTimeout(() => this.flush(), this.time);
        }
        this.buffer.push(value);
    }

    flush(): void {
        this.callback(this.buffer);
        this.buffer = [];
    }
}
