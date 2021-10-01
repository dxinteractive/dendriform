import {Plugin} from '../Plugin';
import {Dendriform} from '../Dendriform';
import type {ChangeCallbackDetails} from '../Dendriform';
import {die} from '../errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPromise = (thing: any): thing is Promise<unknown> => {
    return typeof thing?.then === 'function';
};

export type PluginSubmitOnSubmit<V> = (newValue: V, details: ChangeCallbackDetails<V>) => void|Promise<void>;
export type PluginSubmitOnError = (error: unknown) => void;

export type PluginSubmitConfig<V> = {
    onSubmit: PluginSubmitOnSubmit<V>;
    onError?: PluginSubmitOnError;
};

type State<V> = {
    form: Dendriform<V>;
    previous: Dendriform<V>;
    submitting: Dendriform<boolean>;
};

export class PluginSubmit<V> extends Plugin {

    protected config: PluginSubmitConfig<V>;
    state: State<V>|undefined;

    constructor(config: PluginSubmitConfig<V>) {
        super();
        this.config = config;
    }

    protected clone(): PluginSubmit<V> {
        return new PluginSubmit<V>(this.config);
    }

    private getState(): State<V> {
        const {state} = this;
        if(!state) die(8);
        return state;
    }

    init(form: Dendriform<V>): void {
        const submitting = new Dendriform(false);

        const previous = new Dendriform(form.value, {history: 2}); 
        previous.onChange((newValue, details) => {
            if(details.go === -1) return;

            const done = () => {
                submitting.set(false);
            };

            const error = (e: unknown) => {
                submitting.set(false);
                previous.undo();
                this.config.onError?.(e);
            };

            try {
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
            submitting
        };        
    }

    submit(): void {
        const state = this.getState();
        // call this to create nodes so arrays can diff in onSubmit
        state.previous.branchAll();
        state.previous.set(state.form.value);
    }

    private getForm(): Dendriform<unknown> {
        return this.getState().form.core.getFormAt(this.path);
    }

    private getPreviousForm(): Dendriform<unknown> {
        return this.getState().previous.core.getFormAt(this.path);
    }

    get previous(): unknown {
        return this.getPreviousForm().value;
    }

    /* istanbul ignore next */
    usePrevious(): unknown {
        return this.getPreviousForm().useValue();
    }

    get dirty(): boolean {
        return this.getForm().value !== this.getPreviousForm().value;
    }

    /* istanbul ignore next */
    useDirty(): unknown {
        return this.getForm().useValue() !== this.getPreviousForm().useValue();
    }

    get submitting(): boolean {
        return this.getState().submitting.value;
    }

    /* istanbul ignore next */
    useSubmitting(): boolean {
        return this.getState().submitting.useValue();
    }
    
}