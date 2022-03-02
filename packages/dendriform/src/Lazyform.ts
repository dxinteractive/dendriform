import {useState, useEffect} from 'react';
import {Dendriform} from './Dendriform';
import type {Plugins} from './Dendriform';
import isPromise from 'is-promise';

export type LazyEvaluator<V> = (() => Promise<V>)|(() => V);

export type LazyStatus = {
    pending: boolean;
    complete: boolean;
};

export class Lazyform<V,P extends Plugins = undefined> extends Dendriform<V|undefined,P> {

    _evaluator: LazyEvaluator<V>;
    _dependencies: (Dendriform<any>|Lazyform<any>)[];
    _evalResult: unknown;
    _depCount = 1;
    _evalCount = 0;
    _activeUseValueHooks = 0;
    _completeCallbacks: ((value: V) => void)[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(lazyEvaluator: LazyEvaluator<V>, dependencies: (Dendriform<any>|Lazyform<any>)[] = []) {
        super(undefined);
        this._evaluator = lazyEvaluator;
        this._dependencies = dependencies;

        // problem - dep.onChange calls dep.value, which derives upstream :/
        dependencies.map(dep => dep.onChange(() => {
            this.markStale();
        }));
    }

    private markStale(): void {
        this._depCount++;
        this.status.branch('complete').set(false);
        if(this._activeUseValueHooks > 0) {
            this.evaluate();
        }
    }

    private evaluate(): void {
        if(this._depCount === this._evalCount) return;

        const result = this._evaluator();
        this._evalResult = result;
        this._evalCount = this._depCount;

        if(!isPromise(result)) {
            this.status.branch('complete').set(true);
            this.setValue(result);
            return;
        }

        this.status.branch('pending').set(true);
        result.then(value => {
            if(this._evalCount === this._depCount) {
                this.setValue(value);
                this._completeCallbacks.forEach(cb => cb(value));
                this._completeCallbacks = [];
                this.status.set({
                    pending: false,
                    complete: true
                });
            }
        });
    }

    private setValue(value: V): void {
        this.replace();
        this.set(value);
    }

    //
    // public api
    //

    get value(): V|undefined {
        this.evaluate();
        return this.getValue();
    }

    get lazyValue(): Promise<V> {
        this.evaluate();
        return new Promise(r => {
            this._completeCallbacks.push(r);
        });
    }

    useValue(): V|undefined {
        useEffect(() => {
            this._activeUseValueHooks++;
            return () => {
                this._activeUseValueHooks--;
            };
        }, []);
        return super.useValue();
    }

    status = new Dendriform<LazyStatus>({
        pending: false,
        complete: false
    });
}

export const useLazyform = <V,P extends Plugins = undefined>(lazyEvaluator: LazyEvaluator<V>, dependencies: (Dendriform<any>|Lazyform<any>)[] = []): Lazyform<V,P> => {
    const [form] = useState(() => {
        return new Lazyform<V,P>(lazyEvaluator, dependencies);
    });
    return form;
};