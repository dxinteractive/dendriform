import {useEffect, useState} from 'react';
import {Dendriform} from './Dendriform';

export type LazyDeriver<V> = () => Promise<V>;

export type LazyDeriveChangeCallback<V> = (newValue: V|undefined) => void;

export type LazyDeriveStatus = {
    deriving: boolean;
    derived: boolean;
};

export class LazyDerive<V> {

    _deriver: LazyDeriver<V>;
    _derivedValue: V|undefined;
    _lastDerivedValue: V|undefined;
    _deriving = false;
    _derived = false;
    _changeCallbackRefs = new Set<LazyDeriveChangeCallback<V>>();

    unsubscribe: () => void;
    
    status: Dendriform<LazyDeriveStatus>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(deriver: LazyDeriver<V>, dependencies: (Dendriform<any>|LazyDerive<V>)[]) {
        this._deriver = deriver;

        // subscribe to changes in all dependencies
        // and make unsubscribe() method to unsubscribe
        const unsubs = dependencies.map(dep => dep.onChange(() => {
            this.clear(false);
            if(this._changeCallbackRefs.size > 0) {
                this.startDerive();
            }
        }));

        this.unsubscribe = () => unsubs.forEach(unsub => unsub());

        this.status = new Dendriform<LazyDeriveStatus>({
            deriving: false,
            derived: false
        });
    }

    private async startDerive(): Promise<V> {
        this.status.set(draft => {
            draft.deriving = true;
        });
        const value = await this._deriver();
        this.status.set(draft => {
            draft.deriving = false;
            draft.derived = true;
        });

        this._derivedValue = value;
        this._lastDerivedValue = value;
        this.callChangeCallbacks();
        return value;
    }

    private async getValue(): Promise<V> {
        if(this.status.value.derived) return this._derivedValue as V;
        return await this.startDerive();
    }

    private callChangeCallbacks() {
        this._changeCallbackRefs.forEach(callback => callback(this._derivedValue));
    }

    get value(): Promise<V> {
        return this.getValue();
    }

    onChange(changeCallback: LazyDeriveChangeCallback<V>): (() => void) {
        this._changeCallbackRefs.add(changeCallback);
        // return unsubscriber
        return () => void this._changeCallbackRefs.delete(changeCallback);
    }

    useValue(fallbackToLastValue = false): V|undefined {
        const [value, setValue] = useState<V|undefined>(this._derivedValue);

        useEffect(() => {
            const unsub = this.onChange(newValue => {
                if(fallbackToLastValue && !this.status.value.derived) {
                    newValue = this._lastDerivedValue;
                }
                setValue(newValue);
            });
            this.getValue();
            return () => void unsub();
        }, []);

        return value;
    }

    get currentValue(): V|undefined {
        return this._derivedValue;
    }

    get lastValue(): V|undefined {
        return this._lastDerivedValue;
    }

    clear(clearLastValue = true): void {
        this._derivedValue = undefined;
        if(clearLastValue) {
            this._lastDerivedValue = undefined;
        }
        this.status.set(draft => {
            draft.derived = false;
        });
        this.callChangeCallbacks();
    }
}
