import {useEffect} from 'react';
import {noChange} from './producePatches';
import {die} from './errors';
import {_chunkRegistry} from './Dendriform';
import type {Dendriform, AnyCore} from './Dendriform';

//
// history sync
//

// state
// set of forms whose history is to be grouped together
const historySyncGroups = new Map<AnyCore,number>();
let historySyncGroupsNextKey = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const historySync = (...forms: Dendriform<any>[]): void => {
    const cores = forms.map(form => form.core);

    // validate args
    if(cores.length === 0
        || cores.some(core => core.historyLimit !== cores[0].historyLimit || core.historyLimit < 1)
    ) {
        die(10);
    }

    if(cores.some(core => core.state.historyIndex > 0)) {
        die(11);
    }

    // create key
    const thisKey = ++historySyncGroupsNextKey;

    // find existing keys in common with new ones
    const commonKeys = new Set<number>();
    cores.forEach(core => {
        const existing = historySyncGroups.get(core);
        if(existing) {
            commonKeys.add(existing);
        }
    });

    // update common keys to match newest key
    Array.from(historySyncGroups.entries()).forEach(([core, key]) => {
        if(commonKeys.has(key)) {
            historySyncGroups.set(core, thisKey);
        }
    });

    // add passed in keys
    cores.forEach(core => {
        historySyncGroups.set(core, thisKey);
    });
}

export const useHistorySync = (...forms: Dendriform<any>[]): void => {
    useEffect(() => {
        historySync(...forms);
    }, []);
};

// look through historySyncGroups to find if any forms need blank history items added
// eslint-disable-next-line @typescript-eslint/no-explicit-any
_chunkRegistry.executeHistorySync = (changedFormSet: Set<AnyCore>, offset: number = 0): void => {

    const changedSyncGroups = new Set<number>(
        Array.from(changedFormSet)
            .map(core => historySyncGroups.get(core) as number)
            .filter(key => !!key)
    );

    historySyncGroups.forEach((key, core) => {
        if(!changedFormSet.has(core) && changedSyncGroups.has(key)) {
            if(offset) {
                core.go(offset);
            } else {
                core.set('0', noChange, {});
            }
        }
    });
};