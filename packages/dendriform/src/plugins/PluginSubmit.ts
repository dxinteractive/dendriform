import {Plugin} from '../Plugin';
import {Dendriform} from '../Dendriform';
import type {ChangeCallbackDetails} from '../Dendriform';
import {die} from '../errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPromise = (thing: any): thing is Promise<unknown> => {
    return typeof thing?.then === 'function';
};

export type PluginSubmitOnSubmit<V> = (newValue: V, details: ChangeCallbackDetails<V>) => void|Promise<void>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginSubmitOnError<E> = (error: any) => E|undefined;

export type PluginSubmitConfig<V,E> = {
    onSubmit: PluginSubmitOnSubmit<V>;
    onError?: PluginSubmitOnError<E>;
};

type State<V,E> = {
    form: Dendriform<V>;
    previous: Dendriform<V>;
    submitting: Dendriform<boolean>;
    error: Dendriform<E|undefined>;
};

export class PluginSubmit<V,E=undefined> extends Plugin {

    protected config: PluginSubmitConfig<V,E>;
    state: State<V,E>|undefined;

    constructor(config: PluginSubmitConfig<V,E>) {
        super();
        this.config = config;
    }

    protected clone(): PluginSubmit<V,E> {
        return new PluginSubmit<V,E>(this.config);
    }

    private getState(): State<V,E> {
        const {state} = this;
        if(!state) die(8);
        return state;
    }

    init(form: Dendriform<V>): void {
        const submitting = new Dendriform(false);
        const error = new Dendriform<E|undefined>(undefined);

        const previous = new Dendriform(form.value, {history: 2}); 
        previous.onChange((newValue, details) => {
            if(details.go === -1) return;

            const done = () => {
                submitting.set(false);
            };

            const error = (e: unknown) => {
                submitting.set(false);
                previous.undo();
                const errorResult = this.config.onError?.(e);
                this.getState().error.set(errorResult);
            };

            try {
                this.getState().error.set(undefined);
                const result = this.config.onSubmit(newValue, details);
                if(!isPromise(result)) {
                    return done();
                }
                submitting.set(true);
                result.then(done).catch(error);
            
            } catch(e) {
                error(e);
            }
        });

        this.state = {
            form,
            previous,
            submitting,
            error
        };        
    }

    submit(): void {
        const state = this.getState();
        // call this to create nodes so arrays can diff in onSubmit
        state.previous.branchAll();
        state.previous.set(state.form.value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getForm(): Dendriform<any> {
        return this.getState().form.core.getFormAt(this.path);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get previous(): Dendriform<any> {
        return this.getState().previous.core.getFormAt(this.path);
    }

    get submitting(): Dendriform<boolean> {
        return this.getState().submitting;
    }

    get error(): Dendriform<E|undefined> {
        return this.getState().error;
    }

    get dirty(): {value: boolean, useValue: () => boolean} {
        const value = !Object.is(this.getForm().value, this.previous.value);
        /* istanbul ignore next */
        const useValue = () => !Object.is(this.getForm().useValue(), this.previous.useValue());
        return {value, useValue};
    }
}