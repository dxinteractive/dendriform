import {noChange} from './index';
import type {Dendriform, DeriveCallback, DeriveCallbackDetails} from './index';

export const sync = <V,S>(
    masterForm: Dendriform<V>,
    slaveForm: Dendriform<S>,
    derive?: DeriveCallback<V>
): void => {

    masterForm.onDerive((newValue: V, details: DeriveCallbackDetails) => {
        const {go, replace} = details;
        // if master form calls go(), slave form calls go()
        if(go) return slaveForm.go(go);
        // if master form is going to replace(), slave form will replace()
        slaveForm.replace(replace);
        derive ? derive(newValue, details) : slaveForm.set(noChange);
    });

    slaveForm.onDerive((_newValue: S, details: DeriveCallbackDetails) => {
        const {go, replace} = details;
        // if slave form calls go(), master form calls go()
        if(go) return masterForm.go(go);
        // if slave form is going to replace(), master form will replace()
        if(replace) masterForm.replace();
        masterForm.set(noChange);
    });
};
