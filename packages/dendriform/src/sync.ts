import type {Dendriform, Plugins, DeriveCallback, DeriveCallbackDetails} from './index';
import {noChange} from './producePatches';
import {die} from './errors';
import {useEffect} from 'react';

export const sync = <V,S,VP extends Plugins,SP extends Plugins>(
    masterForm: Dendriform<V,VP>,
    slaveForm: Dendriform<S,SP>,
    derive?: DeriveCallback<V>
): (() => void) => {

    console.warn('sync() is deprecated and will be removed in the next major version. Use historySync() instead.');

    if(masterForm.core.historyLimit !== slaveForm.core.historyLimit) {
        die(5);
    }

    const unsubMaster = masterForm.onDerive((newValue: V, details: DeriveCallbackDetails<V>) => {
        const {go, replace} = details;
        // if master form calls go(), slave form calls go()
        if(go) return slaveForm.go(go);
        // if master form is going to replace(), slave form will replace()
        slaveForm.replace(replace);
        derive ? derive(newValue, details) : slaveForm.set(noChange);
    });

    const unsubSlave = slaveForm.onDerive((_newValue: S, details: DeriveCallbackDetails<S>) => {
        const {go, replace} = details;
        // if slave form calls go(), master form calls go()
        if(go) return masterForm.go(go);
        // if slave form is going to replace(), master form will replace()
        if(replace) masterForm.replace();
        masterForm.set(noChange);
    });

    return () => {
        unsubMaster();
        unsubSlave();
    };
};

export const useSync = <V,S,VP extends Plugins,SP extends Plugins>(
    masterForm: Dendriform<V,VP>,
    slaveForm: Dendriform<S,SP>,
    derive?: DeriveCallback<V>
): void => {
    useEffect(() => sync(masterForm, slaveForm, derive), []);
};
