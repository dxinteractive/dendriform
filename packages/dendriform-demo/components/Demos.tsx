import {useCallback, useEffect, useState} from 'react';
import {Dendriform, useDendriform, useInput, useCheckbox, useSync, array} from 'dendriform';
import {Box, Flex} from '../components/Layout';
import {H2} from '../components/Text';
import styled from 'styled-components';

import type {ThemeProps} from '../pages/_app';

//
// first example
//

function FirstExample(): React.ReactElement {

    const form = useDendriform(() => ({
        name: 'Wappy',
        address: {
            street: 'Pump St'
        },
        pets: [
            {name: 'Spike'},
            {name: 'Spoke'}
        ]
    }));

    form.useChange((value) => {
        console.log('A quick example - form changed:', value);
    });

    const addPet = useCallback(() => {
        form.branch('pets').set(draft => {
            draft.push({name: 'new pet'});
        });
    }, []);

    return <div>
        {form.render('name', form => (
            <label>name <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(['address', 'street'], street => (
            <label>street <input {...useInput(street, 150)} /></label>
        ))}

        <fieldset>
            <legend>pets</legend>

            <ul>
                {form.renderAll('pets', form => (
                    <li>
                        {form.render('name', form => (
                            <label>name <input {...useInput(form, 150)} /></label>
                        ))}
                    </li>
                ))}
            </ul>

            <button onClick={addPet}>Add pet</button>
        </fieldset>
    </div>;
};

const FirstExampleCode = `
import React, {useCallback} from 'react';
import {useDendriform, useInput} from 'dendriform';

function MyComponent(props) {

    const form = useDendriform(() => ({
        name: 'Wappy',
        address: {
            street: 'Pump St'
        },
        pets: [
            {name: 'Spike'},
            {name: 'Spoke'}
        ]
    });

    form.useChange((value) => {
        console.log('A quick example - form changed:', value);
    });

    const addPet = useCallback(() => {
        form.branch('pets').set(draft => {
            draft.push({name: 'new pet'});
        });
    }, []);

    return <div>
        {form.render('name', form => (
            <label>name <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(['address', 'street'], street => (
            <label>street <input {...useInput(street, 150)} /></label>
        ))}

        <fieldset>
            <legend>pets</legend>
            <ul>
                {form.renderAll('pets', form => (
                    <li>
                        {form.render('name', form => (
                            <label>name <input {...useInput(form, 150)} /></label>
                        ))}
                    </li>
                ))}
            </ul>
            <button onClick={addPet}>Add pet</button>
        </fieldset>
    </div>;
};
`;

//
// dendriform outside of react
//

const persistentForm = new Dendriform(1);

if(typeof window !== 'undefined') {
    window.persistentForm = persistentForm;
}

function OutsideReactContainer(): React.ReactElement {
    const [show, setShow] = useState<boolean>(true);
    const toggleShow = useCallback(() => setShow(s => !s), []);

    if(show) {
        return <div>
            <OutsideReact />
            <button onClick={toggleShow}>Unmount</button>
        </div>;
    }

    return <button onClick={toggleShow}>Remount</button>;
}

const OutsideReact = React.memo(function OutsideReact(): React.ReactElement {
    const value = persistentForm.useValue();
    const addOne = useCallback(() => persistentForm.set(value => value + 1), []);

    return <div>
        <code>Value: {value}</code>
        <button onClick={addOne}>Add 1</button>
    </div>;
});

const OutsideReactCode = `
const persistentForm = new Dendriform(1);

if(typeof window !== 'undefined') {
    window.persistentForm = persistentForm;
}

function MyComponent(props) {
    const [show, setShow] = useState(true);
    const toggleShow = useCallback(() => setShow(s => !s), []);

    if(show) {
        return <div>
            <OutsideReact />
            <button onClick={toggleShow}>Unmount</button>
        </div>;
    }

    return <button onClick={toggleShow}>Remount</button>;
}

const OutsideReact = React.memo(function OutsideReact() {
    const value = persistentForm.useValue();
    const addOne = useCallback(() => persistentForm.set(value => value + 1), []);

    return <div>
        <code>Value: {value}</code>
        <button onClick={addOne}>Add 1</button>
    </div>;
});
`;

//
// branching
//

function Branching(): React.ReactElement {
    const form = useDendriform({
        name: 'Ben',
        address: {
            street: '123 Fake St'
        }
    });

    // this is just a demonstration of branching
    // .render() is more concise and more performant

    const nameForm = form.branch('name');
    const streetForm = form.branch(['address','street']);
    const name = nameForm.useValue();
    const street = streetForm.useValue();

    return <div>
        <code>name: {name}</code>
        <code>street: {street}</code>
    </div>;
}

const BranchingCode = `
function MyComponent(props) {
    const form = useDendriform({
        name: 'Ben',
        address: {
            street: '123 Fake St'
        }
    });

    // this is just a demonstration of branching
    // .render() is more concise and more performant

    const nameForm = form.branch('name');
    const streetForm = form.branch(['address','street']);
    const name = nameForm.useValue();
    const street = nameForm.useValue();

    return <div>
        <code>name: {name}</code>
        <code>street: {street}</code>
    </div>;
}
`;

//
// rendering
//

function Rendering(): React.ReactElement {
    const form = useDendriform({
        name: 'Ben',
        address: {
            street: '123 Fake St'
        }
    });

    return <div>
        {form.render(form => {
            const value = form.useValue();
            return <code>{value.name} from {value.address.street}</code>;
        })}

        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(['address', 'street'], form => (
            <label>street: <input {...useInput(form, 150)} /></label>
        ))}
    </div>;
}

const RenderingCode = `
function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});

    const nameForm = form.branch('name');
    const value = nameForm.useValue();

    return <div>
        <code>name: {value}</code>
        <input {...useInput(nameForm, 150)} />
    </div>;
}
`;

//
// rendering deps
//

function RenderingDeps(): React.ReactElement {
    const form = useDendriform('Hi');

    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const intervalId = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(intervalId);
    }, []);

    return <div>
        {form.render(form => <>
            <label>name: <input {...useInput(form, 150)} /></label>
            <code>seconds: {seconds}</code>
        </>, [seconds])}
    </div>;
}

const RenderingDepsCode = `
function MyComponent(props) {
    const form = useDendriform('Hi');

    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const intervalId = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(intervalId);
    }, []);

    return <div>
        {form.render(form => <>
            <label>name: <input {...useInput(form, 150)} /></label>
            <code>seconds: {seconds}</code>
        </>, [seconds])}
    </div>;
}
`;

//
// setting data
//

function SettingData(): React.ReactElement {
    const form = useDendriform({number: 123});

    const set100 = useCallback(() => {
        form.branch('number').set(100);
    }, []);

    const add3 = useCallback(() => {
        form.branch('number').set(num => num + 3);
    }, []);

    const add6immer = useCallback(() => {
        form.set(draft => {
            draft.number += 6;
        });
    }, []);

    return <div>
        {form.render('number', form => <code>{form.useValue()}</code>)}

        <button onClick={set100}>set value to 100</button>
        <button onClick={add3}>add 3 to value</button>
        <button onClick={add6immer}>add 6 to value with immer producer</button>
    </div>;
}

const SettingDataCode = `
function MyComponent(props) {
    const form = useDendriform({number: 123});

    const set100 = useCallback(() => {
        form.branch('number').set(100);
    }, []);

    const add3 = useCallback(() => {
        form.branch('number').set(num => num + 3);
    }, []);

    const add6immer = useCallback(() => {
        form.set(draft => {
            draft.number += 6;
        });
    }, []);

    return <div>
        {form.render('number', form => <code>{form.useValue()}</code>)}

        <button onClick={set100}>set value to 100</button>
        <button onClick={add3}>add 3 to value</button>
        <button onClick={add6immer}>add 6 to value with immer producer</button>
    </div>;
}
`;

//
// setting data with buffering
//

function SettingDataBuffer(): React.ReactElement {
    const form = useDendriform(123);

    form.useChange(newValue => {
        console.log('Setting data with buffering - value changed: ' + newValue);
    });

    const add3nobuffer = useCallback(() => {
        form.set(num => num + 1);
        form.set(num => num + 1);
        form.set(num => num + 1);
    }, []);

    const add3buffer = useCallback(() => {
        form.buffer();
        form.set(num => num + 1);
        form.set(num => num + 1);
        form.set(num => num + 1);
        form.done();
    }, []);

    return <div>
        {form.render(form => <code>{form.useValue()}</code>)}

        <button onClick={add3nobuffer}>add 1, 3 times without buffering</button>
        <button onClick={add3buffer}>add 1, 3 times with buffering</button>
    </div>;
}

const SettingDataBufferCode = `
function MyComponent(props) {
    const form = useDendriform(123);

    form.useChange(newValue => {
        console.log('Setting data with buffering - value changed: ' + newValue);
    });

    const add3nobuffer = useCallback(() => {
        form.set(num => num + 1);
        form.set(num => num + 1);
        form.set(num => num + 1);
    }, []);

    const add3buffer = useCallback(() => {
        form.buffer();
        form.set(num => num + 1);
        form.set(num => num + 1);
        form.set(num => num + 1);
        form.done();
    }, []);

    return <div>
        {form.render(form => <code>{form.useValue()}</code>)}

        <button onClick={add3nobuffer}>add 1, 3 times without buffering</button>
        <button onClick={add3buffer}>add 1, 3 times with buffering</button>
    </div>;
}
`;

//
// form inputs
//

function FormInputs(): React.ReactElement {
    const form = useDendriform(() => ({
        name: 'Bill',
        fruit: 'grapefruit',
        canSwim: true,
        comment: ''
    }));

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('fruit', form => (
            <label>
                select:
                <select {...useInput(form)}>
                    <option value="grapefruit">Grapefruit</option>
                    <option value="lime">Lime</option>
                    <option value="coconut">Coconut</option>
                    <option value="mango">Mango</option>
                </select>
            </label>
        ))}

        {form.render('canSwim', form => (
            <label>
                can you swim?
                <input type="checkbox" {...useCheckbox(form)} />
            </label>
        ))}

        {form.render('comment', form => (
            <label>comment: <textarea {...useCheckbox(form)} /></label>
        ))}
    </div>;
}

const FormInputsCode = `
function MyComponent(props) {
    const form = useDendriform(() => ({
        name: 'Bill',
        fruit: 'grapefruit',
        canSwim: true,
        comment: ''
    });

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('fruit', form => (
            <label>
                select:
                <select {...useInput(form)}>
                    <option value="grapefruit">Grapefruit</option>
                    <option value="lime">Lime</option>
                    <option value="coconut">Coconut</option>
                    <option value="mango">Mango</option>
                </select>
            </label>
        ))}

        {form.render('canSwim', form => (
            <label>
                can you swim?
                <input type="checkbox" {...useCheckbox(form)} />
            </label>
        ))}

        {form.render('comment', form => (
            <label>comment: <textarea {...useCheckbox(form)} /></label>
        ))}
    </div>;
}
`;


//
// subscribe
//

function Subscribe(): React.ReactElement {
    const form = useDendriform(() => ({
        firstName: 'Bill',
        lastName: 'Joe'
    }));

    form.branch('firstName').useChange(newName => {
        console.log('Subscribing to changes - first name changed:', newName);
    });

    form.branch('lastName').useChange(newName => {
        console.log('Subscribing to changes - last name changed:', newName);
    });

    return <div>
        {form.render('firstName', form => (
            <label>first name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('lastName', form => (
            <label>last name: <input {...useInput(form, 150)} /></label>
        ))}
    </div>;
}

const SubscribeCode = `
function MyComponent(props) {
    const form = useDendriform(() => ({
        firstName: 'Bill',
        lastName: 'Joe'
    }));

    form.branch('firstName').useChange(newName => {
        console.log('Subscribing to changes - first name changed:', newName);
    });

    form.branch('lastName').useChange(newName => {
        console.log('Subscribing to changes - last name changed:', newName);
    });

    return <div>
        {form.render('firstName', form => (
            <label>first name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('lastName', form => (
            <label>last name: <input {...useInput(form, 150)} /></label>
        ))}
    </div>;
}
`;

//
// array
//

const offsetElement = (form, offset) => {
    return form.setParent(index => array.move(index, index + offset));
};

function ArrayOperations(): React.ReactElement {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <div>
                <label>colour: <input {...useInput(form, 150)} /></label>

                <button onClick={remove}>remove</button>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </div>;
        })}

        {form.render('colours', form => {

            const shift = useCallback(() => form.set(array.shift()), []);
            const pop = useCallback(() => form.set(array.pop()), []);
            const unshift = useCallback(() => form.set(array.unshift('New colour')), []);
            const push = useCallback(() => form.set(array.push('New colour')), []);
            const move = useCallback(() => form.set(array.move(-1,0)), []);

            return <>
                <button onClick={shift}>shift</button>
                <button onClick={pop}>pop</button>
                <button onClick={unshift}>unshift</button>
                <button onClick={push}>push</button>
                <button onClick={move}>move last to first</button>
            </>;
        })}
    </div>;
}

const ArrayOperationsCode = `
const offsetElement = (form, offset) => {
    return form.setParent(index => array.move(index, index + offset));
};

function MyComponent(props) {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <div>
                <label>colour: <input {...useInput(form, 150)} /></label>

                <button onClick={remove}>remove</button>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </div>;
        })}

        {form.render('colours', form => {

            const shift = useCallback(() => form.set(array.shift()), []);
            const pop = useCallback(() => form.set(array.pop()), []);
            const unshift = useCallback(() => form.set(array.unshift('New colour')), []);
            const push = useCallback(() => form.set(array.push('New colour')), []);
            const move = useCallback(() => form.set(array.move(-1,0)), []);

            return <>
                <button onClick={shift}>shift</button>
                <button onClick={pop}>pop</button>
                <button onClick={unshift}>unshift</button>
                <button onClick={push}>push</button>
                <button onClick={move}>move last to first</button>
            </>;
        })}
    </div>;
}
`;

//
// array indexes
//

function ArrayIndexes(): React.ReactElement {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {
            const colour = form.useValue();
            const index = form.useIndex();
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <div>
                <code>Colour: {colour}, index: {index}</code>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </div>;
        })}
    </div>;
}

const ArrayIndexesCode = `
function MyComponent(props) {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {
            const colour = form.useValue();
            const index = form.useIndex();
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <div>
                <code>Colour: {colour}, index: {index}</code>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </div>;
        })}
    </div>;
}
`;

//
// history
//

function History(): React.ReactElement {
    const form = useDendriform(() => ({name: 'Ben', age: '88'}), {history: 10});

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('age', form => (
            <label>age: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            // this function will only re-render if canUndo or canRedo changes
            return <>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
                <button onClick={() => form.go(-3)} disabled={!canUndo}>Undo 3</button>
            </>;
        })}
    </div>;
}

const HistoryCode = `
function MyComponent(props) {
    const form = useDendriform(() => ({name: 'Ben'}), {history: 10});

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('age', form => (
            <label>age: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            // this function will only re-render if canUndo or canRedo changes
            return <>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
                <button onClick={() => form.go(-3)} disabled={!canUndo}>Undo 3</button>
            </>;
        })}
    </div>;
}
`;

//
// grouping history items
//

function GroupingHistoryItems(): React.ReactElement {
    const form = useDendriform('a', {history: 10});

    const add = useCallback(() => {
        form.set(value => {
            return (value === value.toLowerCase()) ? value.toUpperCase() : value.toLowerCase()
        });
    }, []);

    const replace = useCallback(() => {
        form.replace();
        form.set(value => `${value} replaced`);
    }, []);

    const addMulti = useCallback(() => {
        form.buffer();
        form.set(value => `${value}.`);
        form.buffer();
        form.set(value => `${value}.`);
        form.buffer();
        form.set(value => `${value}.`);
        form.done();
    }, []);

    return <div>
        {form.render(form => (
            <code>value: {form.useValue()}</code>
        ))}

        <button onClick={add}>Add history item</button>
        <button onClick={addMulti}>Add 3 history items</button>
        <button onClick={replace}>Replace history item</button>

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}

const GroupingHistoryItemsCode = `
function MyComponent(props) {
    const form = useDendriform('a', {history: 10});

    const add = useCallback(() => {
        form.set(value => {
            return (value === value.toLowerCase()) ? value.toUpperCase() : value.toLowerCase()
        });
    }, []);

    const replace = useCallback(() => {
        form.replace();
        form.set(value => \`$\{value} replaced\`);
    }, []);

    const addMulti = useCallback(() => {
        form.buffer();
        form.set(value => \`$\{value}.\`);
        form.buffer();
        form.set(value => \`$\{value}.\`);
        form.buffer();
        form.set(value => \`$\{value}.\`);
        form.done();
    }, []);

    return <div>
        {form.render(form => (
            <code>value: {form.useValue()}</code>
        ))}

        <button onClick={add}>Add history item</button>
        <button onClick={addMulti}>Add 3 history items</button>
        <button onClick={replace}>Replace history item</button>

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}
`;

//
// deriving
//

function Deriving(): React.ReactElement {
    const form = useDendriform({
        firstName: 'Robert',
        lastName: 'Clamps',
        fullName: ''
    }, {
        history: 10
    });

    form.useDerive(newValue => {
        form.branch('fullName').set(`${newValue.firstName} ${newValue.lastName}`);
    });

    return <div>
        {form.render('firstName', form => (
            <label>first name: <input {...useInput(form, 150)} /></label>
        ))}

         {form.render('lastName', form => (
            <label>last name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('fullName', form => (
            <code>full name: {form.useValue()}</code>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}

const DerivingCode = `
function MyComponent(props) {
    const form = useDendriform({
        firstName: 'Robert',
        lastName: 'Clamps',
        fullName: ''
    }, {
        history: 10
    });

    form.useDerive(newValue => {
        form.branch('fullName').set(\`$\{newValue.firstName} $\{newValue.lastName}\`);
    });

    return <div>
        {form.render('firstName', form => (
            <label>first name: <input {...useInput(form, 150)} /></label>
        ))}

         {form.render('lastName', form => (
            <label>last name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('fullName', form => (
            <code>full name: {form.useValue()}</code>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}
`;

//
// deriving other
//

function DerivingOther(): React.ReactElement {
    const form = useDendriform({name: 'Bill'});

    const validState = useDendriform({
        nameError: '',
        valid: true
    });

    form.useDerive(newValue => {
        const valid = newValue.name.trim().length > 0;
        const nameError = valid ? '' : 'Name must not be blank';
        validState.branch('valid').set(valid);
        validState.branch('nameError').set(nameError);
    });

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {validState.render(form => {
            const {valid, nameError} = form.useValue();
            const msg = valid ? 'valid' : nameError;
            return <code>{msg}</code>;
        })}
    </div>;
}

const DerivingOtherCode = `
function MyComponent(props) {
    const form = useDendriform({name: 'Bill'});

    const validState = useDendriform({
        nameError: '',
        valid: true
    });

    form.useDerive(newValue => {
        const valid = newValue.name.trim().length > 0;
        const nameError = valid ? '' : 'Name must not be blank';
        validState.branch('valid').set(valid);
        validState.branch('nameError').set(nameError);
    });

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {validState.render(form => {
            const {valid, nameError} = form.useValue();
            const msg = valid ? 'valid' : nameError;
            return <code>{msg}</code>;
        })}
    </div>;
}
`;

//
// sync
//

function Sync(): React.ReactElement {

    const nameForm = useDendriform(() => ({name: 'Bill'}), {history: 100});
    const addressForm = useDendriform(() => ({street: 'Cool St'}), {history: 100});

    useSync(nameForm, addressForm);

    return <div>
        {nameForm.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {addressForm.render('street', form => (
            <label>street: <input {...useInput(form, 150)} /></label>
        ))}

        {nameForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}

const SyncCode = `
function MyComponent(props) {
    const nameForm = useDendriform(() => ({name: 'Bill'}), {history: 100});
    const addressForm = useDendriform(() => ({street: 'Cool St'}), {history: 100});

    useSync(nameForm, addressForm);

    return <div>
        {nameForm.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {addressForm.render('street', form => (
            <label>street: <input {...useInput(form, 150)} /></label>
        ))}

        {nameForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}
`;

//
// sync derive
//

function SyncDerive(): React.ReactElement {

    const namesForm = useDendriform(() => ['Bill', 'Ben', 'Bob'], {history: 100});

    const addressForm = useDendriform(() => ({
        street: 'Cool St',
        occupants: 0
    }), {history: 100});

    useSync(namesForm, addressForm, names => {
        addressForm.branch('occupants').set(names.length);
    });

    const addName = useCallback(() => {
        namesForm.set(draft => {
            draft.push('Name ' + draft.length);
        });
    }, []);

    return <div>
        <fieldset>
            <legend>names</legend>
            <ul>
                {namesForm.renderAll(form => <li>
                    <label><input {...useInput(form, 150)} /></label>
                </li>)}
            </ul>
            <button onClick={addName}>Add name</button>
        </fieldset>

        {addressForm.render('street', form => (
            <label>street: <input {...useInput(form, 150)} /></label>
        ))}

        {addressForm.render('occupants', form => (
            <code>occupants: {form.useValue()}</code>
        ))}

        {namesForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}

const SyncDeriveCode = `
function MyComponent(props) {
    const nameForm = useDendriform(() => ({name: 'Bill'}), {history: 100});
    const addressForm = useDendriform(() => ({street: 'Cool St'}), {history: 100});

    useSync(nameForm, addressForm);

    return <div>
        {nameForm.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {addressForm.render('street', form => (
            <label>street: <input {...useInput(form, 150)} /></label>
        ))}

        {nameForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </div>;
        })}
    </div>;
}
`;

//
// demo
//

type DemoObject = {
    title: string;
    description?: string;
    Demo: React.ComponentType<{}>;
    code: string;
};

const DEMOS: DemoObject[] = [
    {
        title: 'A quick example',
        Demo: FirstExample,
        code: FirstExampleCode
    },
    {
        title: 'Dendriform instance outside of React',
        Demo: OutsideReactContainer,
        code: OutsideReactCode
    },
    {
        title: 'Branching forms',
        Demo: Branching,
        code: BranchingCode
    },
    {
        title: 'Rendering fields',
        Demo: Rendering,
        code: RenderingCode
    },
    {
        title: 'Rendering with dependencies',
        Demo: RenderingDeps,
        code: RenderingDepsCode
    },
    {
        title: 'Setting data',
        Demo: SettingData,
        code: SettingDataCode
    },
    {
        title: 'Setting data with buffering',
        Demo: SettingDataBuffer,
        code: SettingDataBufferCode
    },
    {
        title: 'Form inputs',
        Demo: FormInputs,
        code: FormInputsCode
    },
    {
        title: 'Subscribing to changes',
        Demo: Subscribe,
        code: SubscribeCode
    },
    {
        title: 'Array operations',
        Demo: ArrayOperations,
        code: ArrayOperationsCode
    },
    {
        title: 'Array indexes',
        Demo: ArrayIndexes,
        code: ArrayIndexesCode
    },
    {
        title: 'History',
        Demo: History,
        code: HistoryCode
    },
    {
        title: 'Grouping history items',
        Demo: GroupingHistoryItems,
        code: GroupingHistoryItemsCode
    },
    {
        title: 'Deriving data in a single form',
        Demo: Deriving,
        code: DerivingCode
    },
    {
        title: 'Deriving data in another form',
        Demo: DerivingOther,
        code: DerivingOtherCode
    },
    {
        title: 'Synchronising forms',
        Demo: Sync,
        code: SyncCode
    },
    {
        title: 'Synchronising forms with deriving',
        Demo: SyncDerive,
        code: SyncDeriveCode
    }
];

export function Demos(): React.ReactElement {
    return <Flex flexWrap="wrap">
        {DEMOS.map(({Demo, title, code}, index) => <Flex key={index} mr={4} mb={4}>
            <DemoStyle>
                <Box pb={3}>
                    <H2>{title}</H2>
                </Box>
                <Box>
                    <Demo />
                </Box>
            </DemoStyle>
            {/*<Box ml={4}>
                <Code code={code} />
            </Box>*/}
        </Flex>)}
    </Flex>;
}

const DemoStyle =  styled.div`
    background-color: ${(props: ThemeProps) => props.theme.colors.backgroundLight};
    padding: 1rem;
    margin-bottom: 2rem;
    width: 100%;
    max-width: 30rem;

    label {
        display: block;
        margin-bottom: .5rem;

        input, select, textarea {
            margin-left: 1rem;
        }
    }

    input, select, textarea {
        background-color: ${(props: ThemeProps) => props.theme.colors.background};
        border: none;
        color: ${(props: ThemeProps) => props.theme.colors.heading};
        font-family: ${(props: ThemeProps) => props.theme.fonts.mono};
        font-size: 1rem;
        padding: .25rem .5rem;
    }

    code {
        background-color: ${(props: ThemeProps) => props.theme.colors.background};
        border: none;
        color: ${(props: ThemeProps) => props.theme.colors.subtitle};
        font-family: ${(props: ThemeProps) => props.theme.fonts.mono};
        font-size: 1rem;
        padding: .25rem .5rem;
        margin-bottom: 1rem;
        display: block;
    }

    button {
        background-color: ${(props: ThemeProps) => props.theme.colors.text};
        border: none;
        font-family: ${(props: ThemeProps) => props.theme.fonts.mono};
        font-size: .9rem;
        padding: .25rem .5rem;
        margin-bottom: .3rem;
        margin-right: .3rem;
        cursor: pointer;
        opacity: .8;

        &:hover {
            opacity: 1;
        }

        &:disabled {
            opacity: .5;
            cursor: default;
        }
    }

    fieldset {
        border-top: 1px solid ${(props: ThemeProps) => props.theme.colors.line};
        border-bottom: 1px solid ${(props: ThemeProps) => props.theme.colors.line};
        margin: 1rem 0;
        padding: 1rem 0;

        ul, button {
            margin-left: 1rem;
        }
    }

    legend {
        padding-right: .5rem;
    }
`;

type CodeProps = {
    code: string;
};

const Code = styled((props: CodeProps): React.ReactElement => {
    const {className, code} = props;

    /*useEffect(() => {
        console.log('window.Prism', window.Prism);
        if(typeof window !== 'undefined' && typeof window.Prism !== 'undefined') {
            window.Prism.highlightAll();
        }
    }, [props.code]);*/

    return <pre className={`${className} language-jsx`}>
        <code>{code}</code>
    </pre>
})`
    font-family: ${(props: ThemeProps) => props.theme.fonts.mono};
    color: ${(props: ThemeProps) => props.theme.colors.heading};
    font-size: .8rem;
    line-height: 1.4em;
`;
