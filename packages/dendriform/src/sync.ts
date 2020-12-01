import {noChange} from './index';
import type {Dendriform, DeriveCallback, DeriveCallbackDetails} from './index';

export const sync = <V,S>(
    otherForm: Dendriform<S>,
    derive?: DeriveCallback<V>
): DeriveCallback<V> => {
    let derivedBack = false;
    return (newValue: V, details: DeriveCallbackDetails<V>) => {
        const {go, replace, form} = details;
        // if form calls go(), other form calls go()
        if(go) return otherForm.go(go);
        // if form is going to replace(), other form will replace()
        otherForm.replace(replace);
        derive ? derive(newValue, details) : otherForm.set(noChange);

        if(!derivedBack) {
            derivedBack = true;
            otherForm.onDerive((_newValue: S, details: DeriveCallbackDetails<S>) => {
                const {go, replace} = details;
                // if other form calls go(), form calls go()
                if(go) return form.go(go);
                // if other form is going to replace(), form will replace()
                if(replace) form.replace();
                form.set(noChange);
            });
        }
    };
};
