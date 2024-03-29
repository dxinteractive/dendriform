import {useState, useCallback} from 'react';
import type {Dendriform, Plugins} from './Dendriform';

type UseInputResult = {
    value: string,
    onChange: (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => void
};

export const useInput = <V extends string|null|undefined,P extends Plugins>(form: Dendriform<V,P>, debounce = 0): UseInputResult => {
    const formValue = (form.useValue() || '') as string;
    const [lastFormValue, setLastFormValue] = useState(formValue);
    const [localValue, setLocalValue] = useState(formValue);

    if(formValue !== lastFormValue) {
        setLastFormValue(formValue);
        setLocalValue(formValue);
    }

    const onChange = useCallback(event => {
        const newValue = event.target.value;
        setLocalValue(newValue);
        form.set(newValue, {debounce});
    }, []);

    return {
        value: localValue,
        onChange
    };
};
