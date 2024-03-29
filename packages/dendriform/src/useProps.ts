import {useState, useCallback} from 'react';
import type {Dendriform, Plugins} from './Dendriform';

type UsePropsResult<V> = {
    value: V,
    onChange: (newValue: V) => void
};

export const useProps = <V,P extends Plugins>(form: Dendriform<V,P>, debounce = 0): UsePropsResult<V> => {
    const formValue = form.useValue();
    const [lastFormValue, setLastFormValue] = useState(formValue);
    const [localValue, setLocalValue] = useState(formValue);

    if(formValue !== lastFormValue) {
        setLastFormValue(formValue);
        setLocalValue(formValue);
    }

    const onChange = useCallback((newValue: V) => {
        setLocalValue(newValue);
        form.set(newValue, {debounce});
    }, []);

    return {
        value: localValue,
        onChange
    };
};
