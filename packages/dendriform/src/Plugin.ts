import type {Dendriform} from './Dendriform';
import type {Path} from 'dendriform-immer-patch-optimiser';

export abstract class Plugin {

    protected id = '';
    protected path: Path = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abstract init(form: Dendriform<any,any>|undefined): void;

    cloneAndSpecify(id: string, path: Path): Plugin {
        const clone = this.clone();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        clone.state = this.state;
        clone.id = id;
        clone.path = path;
        return clone;
    }

    protected abstract clone(): Plugin;
}