import type {Dendriform} from './Dendriform';

export abstract class Plugin {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected id = '';

    // to be overwritten
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abstract init(form: Dendriform<any,any>|undefined): void;

    cloneWithId(id: string): Plugin {
        const clone = this.clone();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        clone.state = this.state;
        clone.id = id;
        return clone;
    }

    // to be overwritten
    protected abstract clone(): Plugin;
}