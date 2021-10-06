import {useCallback, useEffect, useState, useRef, memo} from 'react';
import {Dendriform, useDendriform, useInput, useCheckbox, useSync, array, immerable, cancel, diff, PluginSubmit} from 'dendriform';
import {Box, Flex} from '../components/Layout';
import {H2, Link, Text} from '../components/Text';
import styled from 'styled-components';
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';
import type {DropResult} from 'react-beautiful-dnd';
import type {Draft} from 'immer';
import {enableMapSet} from 'immer';
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
        // eslint-disable-next-line no-console
        console.log('A quick example - form changed:', value);
    });

    const addPet = useCallback(() => {
        form.branch('pets').set(draft => {
            draft.push({name: 'new pet'});
        });
    }, []);

    return <Region>
        {form.render('name', form => (
            <Region of="label">name <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render(['address', 'street'], street => (
            <Region of="label">street <input {...useInput(street, 150)} /></Region>
        ))}

        <fieldset>
            <legend>pets</legend>

            <ul>
                {form.renderAll('pets', form => <Region of="li">
                    {form.render('name', form => (
                        <Region of="label">name <input {...useInput(form, 150)} /></Region>
                    ))}
                </Region>)}
            </ul>

            <button type="button" onClick={addPet}>Add pet</button>
        </fieldset>
    </Region>;
}

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
                {form.renderAll('pets', form => <li>
                    {form.render('name', form => (
                        <label>name <input {...useInput(form, 150)} /></label>
                    ))}
                </li>)}
            </ul>
            <button type="button" onClick={addPet}>Add pet</button>
        </fieldset>
    </div>;
};
`;

//
// dendriform outside of react
//

const persistentForm = new Dendriform(1);

if(typeof window !== 'undefined') {
    // eslint-disable-next-line  @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.persistentForm = persistentForm;
}

function OutsideReactContainer(): React.ReactElement {
    const [show, setShow] = useState<boolean>(true);
    const toggleShow = useCallback(() => setShow(s => !s), []);

    if(show) {
        return <Region>
            <OutsideReact />
            <button type="button" onClick={toggleShow}>Unmount</button>
        </Region>;
    }

    return <Region>
        <button type="button" onClick={toggleShow}>Remount</button>
    </Region>;
}

const OutsideReact = memo(function OutsideReact(): React.ReactElement {
    const value = persistentForm.useValue();
    const addOne = useCallback(() => persistentForm.set(value => value + 1), []);

    return <Region>
        <code>Value: {value}</code>
        <button type="button" onClick={addOne}>Add 1</button>
    </Region>;
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
            <button type="button" onClick={toggleShow}>Unmount</button>
        </div>;
    }

    return <button type="button" onClick={toggleShow}>Remount</button>;
}

const OutsideReact = React.memo(function OutsideReact() {
    const value = persistentForm.useValue();
    const addOne = useCallback(() => persistentForm.set(value => value + 1), []);

    return <div>
        <code>Value: {value}</code>
        <button type="button" onClick={addOne}>Add 1</button>
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

    return <Region>
        <code>name: {name}</code>
        <code>street: {street}</code>
    </Region>;
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

    return <Region>
        {form.render(form => {
            const value = form.useValue();
            return <Region of="code">{value.name} from {value.address.street}</Region>;
        })}

        {form.render('name', form => (
            <Region of="label">name: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render(['address', 'street'], form => (
            <Region of="label">street: <input {...useInput(form, 150)} /></Region>
        ))}
    </Region>;
}

const RenderingCode = `
function MyComponent(props) {
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

    return <Region>
        {form.render(form => <Region>
            <label>name: <input {...useInput(form, 150)} /></label>
            <code>seconds: {seconds}</code>
        </Region>, [seconds])}
    </Region>;
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

    return <Region>
        {form.render('number', form => <Region of="code">{form.useValue()}</Region>)}

        <button type="button" onClick={set100}>set value to 100</button>
        <button type="button" onClick={add3}>add 3 to value</button>
        <button type="button" onClick={add6immer}>add 6 to value with immer producer</button>
    </Region>;
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

        <button type="button" onClick={set100}>set value to 100</button>
        <button type="button" onClick={add3}>add 3 to value</button>
        <button type="button" onClick={add6immer}>add 6 to value with immer producer</button>
    </div>;
}
`;

//
// setting data with buffering
//

function SettingDataBuffer(): React.ReactElement {
    const form = useDendriform(123);

    form.useChange(newValue => {
        // eslint-disable-next-line no-console
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

    return <Region>
        {form.render(form => <Region of="code">{form.useValue()}</Region>)}

        <button type="button" onClick={add3nobuffer}>add 1, 3 times without buffering</button>
        <button type="button" onClick={add3buffer}>add 1, 3 times with buffering</button>
    </Region>;
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

        <button type="button" onClick={add3nobuffer}>add 1, 3 times without buffering</button>
        <button type="button" onClick={add3buffer}>add 1, 3 times with buffering</button>
    </div>;
}
`;

//
// setting data with debouncing
//

function SettingDataDebounce(): React.ReactElement {
    const form = useDendriform({
        a: 0,
        b: 0
    });

    const changeA = useCallback(() => {
        form.branch('a').set(Math.floor(Math.random() * 1000), {debounce: 300});
    }, []);

    const changeB = useCallback(() => {
        form.branch('b').set(Math.floor(Math.random() * 1000), {debounce: 300});
    }, []);

    return <Region>
        {form.render('a', form => <Region of="code">{form.useValue()}</Region>)}
        {form.render('b', form => <Region of="code">{form.useValue()}</Region>)}

        <button type="button" onClick={changeA}>change a with 300ms debounce</button>
        <button type="button" onClick={changeB}>change b with 300ms debounce</button>
    </Region>;
}

const SettingDataDebounceCode = `
function MyComponent(props) {
    const form = useDendriform({
        a: 0,
        b: 0
    });

    const changeA = useCallback(() => {
        form.branch('a').set(Math.floor(Math.random() * 1000), {debounce: 300});
    }, []);

    const changeB = useCallback(() => {
        form.branch('b').set(Math.floor(Math.random() * 1000), {debounce: 300});
    }, []);

    return <div>
        {form.render('a', form => <code>a: {form.useValue()}</code>)}
        {form.render('b', form => <code>b: {form.useValue()}</code>)}

        <button type="button" onClick={changeA}>change a with 300ms debounce</button>
        <button type="button" onClick={changeB}>change b with 300ms debounce</button>
    </div>;
}
`;

//
// es6 classes
//

class Person {
    firstName = '';
    lastName = '';
    [immerable] = true;
}

function ES6Classes(): React.ReactElement {

    const form = useDendriform(() => {
        const person = new Person();
        person.firstName = 'Billy';
        person.lastName = 'Thump';
        return person;
    });

    return <Region>
        {form.render('firstName', form => (
            <Region of="label">first name: <input {...useInput(form, 150)} /></Region>
        ))}
        {form.render('lastName', form => (
            <Region of="label">last name: <input {...useInput(form, 150)} /></Region>
        ))}
    </Region>;
}

const ES6ClassesCode = `
import {immerable} from 'dendriform';

class Person {
    firstName = '';
    lastName = '';
    [immerable] = true;
}

function MyComponent(props) {

    const form = useDendriform(() => {
        const person = new Person();
        person.firstName = 'Billy';
        person.lastName = 'Thump';
        return person;
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
// es6 maps
//

enableMapSet();

function ES6Maps(): React.ReactElement {

    const form = useDendriform(() => {
        const usersById = new Map<number, string>();
        usersById.set(123, 'Harry');
        usersById.set(456, 'Larry');
        return usersById;
    });

    return <Region>
        {form.render(123, form => (
            <label>123: <input {...useInput(form, 150)} /></label>
        ))}
        {form.render(456, form => (
            <label>456: <input {...useInput(form, 150)} /></label>
        ))}
    </Region>;
}

const ES6MapsCode = `
import {enableMapSet} from 'dendriform';
enableMapSet();

function MyComponent(props) {

    const form = useDendriform(() => {
        const usersById = new Map<number, string>();
        usersById.set(123, 'Harry');
        usersById.set(456, 'Larry');
        return usersById;
    });

    return <div>
        {form.render(123, form => (
            <label>123: <input {...useInput(form, 150)} /></label>
        ))}
        {form.render(456, form => (
            <label>456: <input {...useInput(form, 150)} /></label>
        ))}
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

    return <Region>
        {form.render('name', form => (
            <Region of="label">name: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render('fruit', form => (
            <Region of="label">
                select:
                <select {...useInput(form)}>
                    <option value="grapefruit">Grapefruit</option>
                    <option value="lime">Lime</option>
                    <option value="coconut">Coconut</option>
                    <option value="mango">Mango</option>
                </select>
            </Region>
        ))}

        {form.render('canSwim', form => (
            <Region of="label">
                can you swim?
                <input type="checkbox" {...useCheckbox(form)} />
            </Region>
        ))}

        {form.render('comment', form => (
            <Region of="label">comment: <textarea {...useInput(form)} /></Region>
        ))}
    </Region>;
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
            <label>comment: <textarea {...useInput(form)} /></label>
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
        // eslint-disable-next-line no-console
        console.log('Subscribing to changes - first name changed:', newName);
    });

    form.branch('lastName').useChange(newName => {
        // eslint-disable-next-line no-console
        console.log('Subscribing to changes - last name changed:', newName);
    });

    return <Region>
        {form.render('firstName', form => (
            <Region of="label">first name: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render('lastName', form => (
            <Region of="label">last name: <input {...useInput(form, 150)} /></Region>
        ))}
    </Region>;
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

const offsetElement = <T,>(form: Dendriform<T>, offset: number): void => {
    return form.setParent(index => array.move(index as number, index as number + offset));
};

function ArrayOperations(): React.ReactElement {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    const coloursForm = form.branch('colours');
    const shift = useCallback(() => coloursForm.set(array.shift()), []);
    const pop = useCallback(() => coloursForm.set(array.pop()), []);
    const unshift = useCallback(() => coloursForm.set(array.unshift('Puce')), []);
    const push = useCallback(() => coloursForm.set(array.push('Puce')), []);
    const move = useCallback(() => coloursForm.set(array.move(-1,0)), []);

    return <Region>
        {form.renderAll('colours', form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <Region>
                <label>colour: <input {...useInput(form, 150)} /></label>

                <button type="button" onClick={remove}>remove</button>
                <button type="button" onClick={moveDown}>down</button>
                <button type="button" onClick={moveUp}>up</button>
            </Region>;
        })}
        <button type="button" onClick={shift}>shift</button>
        <button type="button" onClick={pop}>pop</button>
        <button type="button" onClick={unshift}>unshift</button>
        <button type="button" onClick={push}>push</button>
        <button type="button" onClick={move}>move last to first</button>
    </Region>;
}

const ArrayOperationsCode = `
const offsetElement = (form, offset) => {
    return form.setParent(index => array.move(index, index + offset));
};

function MyComponent(props) {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    const coloursForm = form.branch('colours');
    const shift = useCallback(() => coloursForm.set(array.shift()), []);
    const pop = useCallback(() => coloursForm.set(array.pop()), []);
    const unshift = useCallback(() => coloursForm.set(array.unshift('Puce')), []);
    const push = useCallback(() => coloursForm.set(array.push('Puce')), []);
    const move = useCallback(() => coloursForm.set(array.move(-1,0)), []);

    return <div>
        {form.renderAll('colours', form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <div>
                <label>colour: <input {...useInput(form, 150)} /></label>

                <button type="button" onClick={remove}>remove</button>
                <button type="button" onClick={moveDown}>down</button>
                <button type="button" onClick={moveUp}>up</button>
            </div>;
        })}

        <button type="button" onClick={shift}>shift</button>
        <button type="button" onClick={pop}>pop</button>
        <button type="button" onClick={unshift}>unshift</button>
        <button type="button" onClick={push}>push</button>
        <button type="button" onClick={move}>move last to first</button>
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

    return <Region>
        {form.renderAll('colours', form => {
            const colour = form.useValue();
            const index = form.useIndex();
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <Region>
                <code>Colour: {colour}, index: {index}</code>
                <button type="button" onClick={moveDown}>down</button>
                <button type="button" onClick={moveUp}>up</button>
            </Region>;
        })}
    </Region>;
}

const ArrayIndexesCode = `
const offsetElement = (form, offset) => {
    return form.setParent(index => array.move(index, index + offset));
};

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
                <button type="button" onClick={moveDown}>down</button>
                <button type="button" onClick={moveUp}>up</button>
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

    return <Region>
        {form.render('name', form => (
            <Region of="label">name: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render('age', form => (
            <Region of="label">age: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            // this function will only re-render if canUndo or canRedo changes
            return <Region>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
                <button type="button" onClick={() => form.go(-3)} disabled={!canUndo}>Undo 3</button>
            </Region>;
        })}
    </Region>;
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
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
                <button type="button" onClick={() => form.go(-3)} disabled={!canUndo}>Undo 3</button>
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
        form.set(value => value === value.toLowerCase()
            ? value.toUpperCase()
            : value.toLowerCase()
        );
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

    return <Region>
        {form.render(form => (
            <Region of="code">value: {form.useValue()}</Region>
        ))}

        <button type="button" onClick={add}>Add history item</button>
        <button type="button" onClick={addMulti}>Add 3 history items</button>
        <button type="button" onClick={replace}>Replace history item</button>

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <Region>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
            </Region>;
        })}
    </Region>;
}

const GroupingHistoryItemsCode = `
function MyComponent(props) {
    const form = useDendriform('a', {history: 10});

    const add = useCallback(() => {
        form.set(value => value === value.toLowerCase()
            ? value.toUpperCase()
            : value.toLowerCase()
        );
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

        <button type="button" onClick={add}>Add history item</button>
        <button type="button" onClick={addMulti}>Add 3 history items</button>
        <button type="button" onClick={replace}>Replace history item</button>

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <div>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
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

    return <Region>
        {form.render('firstName', form => (
            <Region of="label">first name: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render('lastName', form => (
            <Region of="label">last name: <input {...useInput(form, 150)} /></Region>
        ))}

        {form.render('fullName', form => (
            <Region>full name: {form.useValue()}</Region>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <Region>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
            </Region>;
        })}
    </Region>;
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
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
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

    return <Region>
        {form.render('name', form => (
            <Region of="label">name: <input {...useInput(form, 150)} /></Region>
        ))}

        {validState.render(form => {
            const {valid, nameError} = form.useValue();
            const msg = valid ? 'valid' : nameError;
            return <Region of="code">{msg}</Region>;
        })}
    </Region>;
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

    return <Region>
        {nameForm.render('name', form => (
            <Region of="label">name: <input {...useInput(form, 150)} /></Region>
        ))}

        {addressForm.render('street', form => (
            <Region of="label">street: <input {...useInput(form, 150)} /></Region>
        ))}

        {nameForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <Region>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
            </Region>;
        })}
    </Region>;
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
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
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
        // eslint-disable-next-line no-console
        console.log(`Deriving occupants for ${JSON.stringify(names)}`);
        addressForm.branch('occupants').set(names.length);
    });

    const addName = useCallback(() => {
        namesForm.set(draft => {
            draft.push('Name ' + draft.length);
        });
    }, []);

    return <Region>
        <fieldset>
            <legend>names</legend>
            <ul>
                {namesForm.renderAll(form => <Region of="li">
                    <label><input {...useInput(form, 150)} /></label>
                </Region>)}
            </ul>
            <button type="button" onClick={addName}>Add name</button>
        </fieldset>

        {addressForm.render('street', form => (
            <Region of="label">street: <input {...useInput(form, 150)} /></Region>
        ))}

        {addressForm.render('occupants', form => (
            <Region of="code">occupants: {form.useValue()}</Region>
        ))}

        {namesForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <Region>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
            </Region>;
        })}
    </Region>;
}

const SyncDeriveCode = `
function MyComponent(props) {

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
                {namesForm.renderAll(form => <Region of="li">
                    <label><input {...useInput(form, 150)} /></label>
                </Region>)}
            </ul>
            <button type="button" onClick={addName}>Add name</button>
        </fieldset>

        {addressForm.render('street', form => (
            <label>street: <input {...useInput(form, 150)} /></label>
        ))}

        {addressForm.render('occupants', form => (
            <code>occupants: {form.useValue()}</code>
        ))}

        {namesForm.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <>
                <button type="button" onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button type="button" onClick={form.redo} disabled={!canRedo}>Redo</button>
            </>;
        })}
    </div>;
}
`;

//
// drag and drop
//

function dndReorder<V extends unknown[]>(result: DropResult): ((draft: Draft<V>) => void) {
    return (draft: Draft<V>): void => {
        if(!result.destination) return;

        const startIndex = result.source.index;
        const endIndex = result.destination.index;
        if(endIndex === startIndex) return;

        const [removed] = draft.splice(startIndex, 1);
        draft.splice(endIndex, 0, removed);
    };
}

function DragAndDrop(): React.ReactElement {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    const onDragEnd = useCallback(result => {
        form.branch('colours').set(dndReorder(result));
    }, []);

    const onAdd = useCallback(() => {
        form.branch('colours').set(array.push('Puce'));
    }, []);

    return <Region>
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="list">
                {provided => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                        <Region>
                            <DragAndDropList form={form.branch('colours')} />
                            {provided.placeholder}
                        </Region>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
        <button type="button" onClick={onAdd}>add new</button>
    </Region>;
}

type DragAndDropListProps = {
    form: Dendriform<string[]>;
};

function DragAndDropList(props: DragAndDropListProps): React.ReactElement {
    return props.form.renderAll(form => {

        const id = `${form.id}`;
        const index = form.useIndex();
        const remove = useCallback(() => form.set(array.remove()), []);

        return <Draggable key={id} draggableId={id} index={index}>
            {provided => <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
            >
                <Region>
                    <label>colour: <input {...useInput(form, 150)} /></label>
                    <button type="button" onClick={remove}>remove</button>
                </Region>
            </div>}
        </Draggable>;
    });
}

const DragAndDropCode = `
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';

const dndReorder = (result) => (draft) => {
    if(!result.destination) return;

    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    if(endIndex === startIndex) return;

    const [removed] = draft.splice(startIndex, 1);
    draft.splice(endIndex, 0, removed);
};

function DragAndDrop() {

    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    const onDragEnd = useCallback(result => {
        form.branch('colours').set(dndReorder(result));
    }, []);

    const onAdd = useCallback(() => {
        form.branch('colours').set(array.push('Puce'));
    }, []);

    return <div>
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="list">
                {provided => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                        <DragAndDropList form={form.branch('colours')} />
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>

        <button type="button" onClick={push}>add new</button>
    </div>;
}

function DragAndDropList(props) {
    return props.form.renderAll(form => {

        const id = \`$\{form.id}\`;
        const index = form.useIndex();
        const remove = useCallback(() => form.set(array.remove()), []);

        return <Draggable key={id} draggableId={id} index={index}>
            {provided => <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
            >
                <label>colour: <input {...useInput(form, 150)} /></label>
                <button type="button" onClick={remove}>remove</button>
            </div>}
        </Draggable>;
    });
}
`;

//
// pluginsubmit
//

type SubmitValue = {
    firstName: string;
    lastName: string;
};

type SubmitPlugins = {
    submit: PluginSubmit<SubmitValue,string>;
};

const causeAnErrorForm = new Dendriform(false);

async function fakeSave(value: SubmitValue): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('saving', value);
    await new Promise(r => setTimeout(r, 1000));
    if(causeAnErrorForm.value) {
        throw new Error('Error!');
    }
    // eslint-disable-next-line no-console
    console.log('saved');
}

function PluginSubmitExample(): React.ReactElement {

    const initialValue = {
        firstName: 'Ben',
        lastName: 'Blen'
    };

    const plugins = (): SubmitPlugins => ({
        submit: new PluginSubmit({
            onSubmit: async (newValue: SubmitValue) => {
                await fakeSave(newValue);
            },
            onError: e => e.message
        })
    });    

    const form = useDendriform<SubmitValue,SubmitPlugins>(() => initialValue, {plugins});

    const onSubmit = useCallback((e) => {
        e.preventDefault();
        form.plugins.submit.submit();
    }, []);

    return <Region>
        <form onSubmit={onSubmit}>
            {form.render('firstName', form => {
                const hasChanged = form.plugins.submit.dirty.useValue();
                return <Region of="label">first name: <input {...useInput(form, 150)} /> {hasChanged ? '*' : ''}</Region>;
            })}

            {form.render('lastName', form => {
                const hasChanged = form.plugins.submit.dirty.useValue();
                return <Region of="label">last name: <input {...useInput(form, 150)} /> {hasChanged ? '*' : ''}</Region>;
            })}

            {form.render(form => {
                const submitting = form.plugins.submit.submitting.useValue();
                return <Region>
                    <button type="submit" disabled={!form.plugins.submit.dirty.useValue()}>Submit</button>
                    {submitting && <span>Saving...</span>}
                </Region>;
            })}

            {form.plugins.submit.error.render(form => {
                const error = form.useValue();
                return <Region>
                    {error && <code>{error}</code>}
                </Region>;
            })}
        </form>

        {causeAnErrorForm.render(form => (
            <Region of="label">
                cause an error on submit
                <input type="checkbox" {...useCheckbox(form)} />
            </Region>
        ))}
    </Region>;
}

const PluginSubmitExampleCode = `
const causeAnErrorForm = new Dendriform(false);

async function fakeSave(value) {
    console.log('saving', value);
    await new Promise(r => setTimeout(r, 1000));
    if(causeAnErrorForm.value) {
        throw new Error('Error!');
    }
    console.log('saved');
}

function PluginSubmitExample() {

    const initialValue = {
        firstName: 'Ben',
        lastName: 'Blen'
    };

    const plugins = () => ({
        submit: new PluginSubmit({
            onSubmit: async (newValue) => {
                await fakeSave(newValue);
            }
        })
    });    

    const form = useDendriform(() => initialValue, {plugins});

    const onSubmit = useCallback((e) => {
        e.preventDefault();
        form.plugins.submit.submit();
    }, []);

    return <>
        <form onSubmit={onSubmit}>
            {form.render('firstName', form => {
                const hasChanged = form.plugins.submit.dirty.useValue();
                return <label>first name: <input {...useInput(form, 150)} /> {hasChanged ? '*' : ''}</label>;
            })}

            {form.render('lastName', form => {
                const hasChanged = form.plugins.submit.dirty.useValue();
                return <label>last name: <input {...useInput(form, 150)} /> {hasChanged ? '*' : ''}</label>;
            })}

            {form.render(form => {
                const submitting = form.plugins.submit.useSubmitting();
                return <>
                    <button type="submit" disabled={!form.plugins.submit.dirty.useValue()}>Submit</button>
                    {submitting && <span>Saving...</span>}
                </>;
            })}

            {form.plugins.submit.error.render(form => {
                const error = form.useValue();
                return <>{error && <code>{error}</code>}</>;
            })}
        </form>

        {causeAnErrorForm.render(form => (
            <label>
                cause an error on submit
                <input type="checkbox" {...useCheckbox(form)} />
            </label>
        ))}
    </>;
}
`;

//
// cancel
//

function Cancel(): React.ReactElement {

    const ageForm = useDendriform(() => 10);

    ageForm.useDerive(age => {
        if(age < 0) {
            throw cancel('Age cannot be negative');
        }
    });

    
    // eslint-disable-next-line no-console
    ageForm.useCancel(reason => console.warn(reason));

    const setTo5 = useCallback(() => ageForm.set(5), []);
    const setTo10 = useCallback(() => ageForm.set(10), []);
    const setToMinus5 = useCallback(() => ageForm.set(-5), []);

    return <Region>

        {ageForm.render(form => (
            <Region of="label">age: <code>{form.useValue()}</code></Region>
        ))}

        <button type="button" onClick={setTo5}>set to 5</button>
        <button type="button" onClick={setTo10}>set to 10</button>
        <button type="button" onClick={setToMinus5}>set to -5</button>

    </Region>;
}

const CancelCode = `
function MyComponent(props) {

    const ageForm = useDendriform(() => 10);

    ageForm.useDerive(age => {
        if(age < 0) {
            throw cancel('Age cannot be negative');
        }
    });

    ageForm.useCancel(reason => console.warn(reason));

    const setTo5 = useCallback(() => ageForm.set(5), []);
    const setTo10 = useCallback(() => ageForm.set(10), []);
    const setToMinus5 = useCallback(() => ageForm.set(-5), []);

    return <div>

        {ageForm.render(form => (
            <label>age: <code>{form.useValue()}</code></label>
        ))}

        <button type="button" onClick={setTo5}>set to 5</button>
        <button type="button" onClick={setTo10}>set to 10</button>
        <button type="button" onClick={setToMinus5}>set to -5</button>

    </div>;
}
`;

type ForeignKeyPerson = {
    name: string;
    faveColours: Set<number>;
};

function ForeignKey(): React.ReactElement {

    // colours

    const coloursForm = useDendriform<Map<number,string>>(() => new Map([
        [0, 'Blue'],
        [1, 'Yellow']
    ]));

    const nextColourId = useRef<number>(2);

    const addColour = useCallback(() => {
        coloursForm.set(draft => {
            draft.set(nextColourId.current++, 'Green');
        });
    }, []);

    // people

    const peopleForm = useDendriform<Map<number,ForeignKeyPerson>>(() => new Map([
        [0, {
            name: 'George',
            faveColours: new Set([0])
        }],
        [1, {
            name: 'Pat',
            faveColours: new Set([0, 1])
        }]
    ]));

    const nextPersonId = useRef<number>(2);

    const addPerson = useCallback(() => {
        peopleForm.set(draft => {
            draft.set(nextPersonId.current++, {
                name: 'Floop',
                faveColours: new Set()
            });
        });
    }, []);

    // cancellation state

    const [cancelMessage, setCancelMessage] = useState('');

    // constraints

    coloursForm.useDerive((colourValue, details) => {

        const [,removed] = diff(details);

        const referencedPeople = [...peopleForm.value.entries()].filter(([,person]) => {
            return removed.some(({key}) => person.faveColours.has(key as number));
        });

        if(referencedPeople.length > 0) {
            if(!details.force) {
                // if not forcing, throw an error to say why this change cant be made
                const colourNames = removed.map(({value}) => value).join(', ');
                const personNames = referencedPeople.map(([,person]) => person.name).join(', ');
                throw cancel(`Colour(s) ${colourNames} cannot be deleted because they are referenced by ${personNames}`);

            } else {
                // if forcing, delete all people with references
                peopleForm.set(draft => {
                    referencedPeople.forEach(([key]) => {
                        draft.delete(key);
                    });
                });
            }
        }
    });

    coloursForm.useCancel(message => setCancelMessage(message));

    coloursForm.useChange(() => setCancelMessage(''));

    // rendering

    return <Region>
        <fieldset>
            <legend>colours</legend>
            {cancelMessage && <code>{cancelMessage}</code>}
            <ul>
                {coloursForm.renderAll(form => (
                    <Region of="li">
                        <label>colour <input {...useInput(form, 150)} /></label>
                        <button type="button" onClick={() => form.set(array.remove())}>remove</button>
                        <button type="button" onClick={() => form.set(array.remove(), {force: true})}>remove with force</button>
                    </Region>
                ))}
            </ul>
            <button type="button" onClick={addColour}>Add colour</button>
        </fieldset>
        <fieldset>
            <legend>people</legend>
            <ul>
                {peopleForm.renderAll(personForm => (
                    <Region of="li">
                        {personForm.render('name', form => (
                            <Region of="label">name <input {...useInput(form, 150)} /></Region>
                        ))}

                        <fieldset>
                            <legend>fave colours</legend>
                            <FaveColours coloursForm={coloursForm} personForm={personForm} />
                        </fieldset>
                        <button type="button" onClick={() => personForm.set(array.remove())}>remove</button>
                    </Region>
                ))}
            </ul>
            <button type="button" onClick={addPerson}>Add person</button>
        </fieldset>

    </Region>;
}

type FaveColoursProps = {
    coloursForm: Dendriform<Map<number,string>>;
    personForm: Dendriform<ForeignKeyPerson>;
};

function FaveColours(props: FaveColoursProps): React.ReactElement {
    const {coloursForm, personForm} = props;
    return <Region>
        <code>
            {personForm.render('faveColours', form => (
                <span>{JSON.stringify(Array.from(form.useValue().values()))}</span>
            ))}
        </code>
        <ul>
            {coloursForm.renderAll(colourForm => {
                const id = colourForm.key as number;
                const colour = colourForm.useValue();
                const hasFave = personForm.branch('faveColours').useValue().has(id as number);

                const toggle = () => personForm.set(draft => {
                    if(hasFave) {
                        draft.faveColours.delete(id);
                    } else {
                        draft.faveColours.add(id);
                    }
                });

                const button = <button type="button" onClick={toggle}>{hasFave ? 'yes' : 'no'}</button>;
                return <Region of="li">{colour} {button}</Region>;
            })}
        </ul>
    </Region>;
}

const ForeignKeyCode = `
import {useDendriform, diff} from 'dendriform';
import {useState, useRef} from 'react';

function MyComponent(props) {
    // colours

    const coloursForm = useDendriform(() => new Map([
        [0, 'Blue'],
        [1, 'Yellow']
    ]));

    const nextColourId = useRef(2);

    const addColour = useCallback(() => {
        coloursForm.set(draft => {
            draft.set(nextColourId.current++, 'Green');
        });
    }, []);

    // people

    const peopleForm = useDendriform(() => new Map([
        [0, {
            name: 'George',
            faveColours: new Set([0])
        }],
        [1, {
            name: 'Pat',
            faveColours: new Set([0, 1])
        }]
    ]));

    const nextPersonId = useRef(2);

    const addPerson = useCallback(() => {
        peopleForm.set(draft => {
            draft.set(nextPersonId.current++, {
                name: 'Floop',
                faveColours: new Set()
            });
        });
    }, []);

    // cancellation state

    const [cancelMessage, setCancelMessage] = useState('');

    // constraints

    coloursForm.useDerive((colourValue, details) => {

        const [,removed] = diff(details);

        const referencedPeople = [...peopleForm.value.entries()].filter(([,person]) => {
            return removed.some(({key}) => person.faveColours.has(key));
        });

        if(referencedPeople.length > 0) {
            if(!details.force) {
                // if not forcing, throw an error to say why this change cant be made
                const colourNames = removed.map(({value}) => value).join(', ');
                const personNames = referencedPeople.map(([,person]) => person.name).join(', ');
                throw cancel('Colour(s) ' + colourNames + ' cannot be deleted because they are referenced by ' + personNames);

            } else {
                // if forcing, delete all people with references
                peopleForm.set(draft => {
                    referencedPeople.forEach(([key]) => {
                        draft.delete(key);
                    });
                })
            }
        }
    });

    coloursForm.useCancel(message => setCancelMessage(message));

    coloursForm.useChange(() => setCancelMessage(''));

    // rendering

    return <div>
        <fieldset>
            <legend>colours</legend>
            {cancelMessage && <code>{cancelMessage}</code>}
            <ul>
                {coloursForm.renderAll(form => (
                    <li>
                        <label>colour <input {...useInput(form, 150)} /></label>
                        <button type="button" onClick={() => form.set(array.remove())}>remove</button>
                        <button type="button" onClick={() => form.set(array.remove(), {force: true})}>remove with force</button>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={addColour}>Add colour</button>
        </fieldset>
        <fieldset>
            <legend>people</legend>
            <ul>
                {peopleForm.renderAll(personForm => (
                    <li>
                        {personForm.render('name', form => (
                            <label>name <input {...useInput(form, 150)} /></label>
                        ))}

                        <fieldset>
                            <legend>fave colours</legend>
                            <FaveColours coloursForm={coloursForm} personForm={personForm} />
                        </fieldset>
                        <button type="button" onClick={() => personForm.set(array.remove())}>remove</button>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={addPerson}>Add person</button>
        </fieldset>
    </div>;
}

function FaveColours(props) {
    const {coloursForm, personForm} = props;
    return <div>
        <code>
            {personForm.render('faveColours', form => (
                <span>{JSON.stringify(Array.from(form.useValue().values()))}</span>
            ))}
        </code>
        <ul>
            {coloursForm.renderAll(colourForm => {
                const id = colourForm.key;
                const colour = colourForm.useValue();
                const hasFave = personForm.branch('faveColours').useValue().has(id);

                const toggle = () => personForm.set(draft => {
                    if(hasFave) {
                        draft.faveColours.delete(id);
                    } else {
                        draft.faveColours.add(id);
                    }
                });

                const button = <button type="button" onClick={toggle}>{hasFave ? 'yes' : 'no'}</button>;
                return <li>{colour} {button}</li>;
            })}
        </ul>
    </div>;
}
`;

//
// input refs
//

// type InputRefsPerson = {
//     name: string;
//     age: string;
// };
//
// type InputRefsMap = {
//     [id: string]: HTMLInputElement;
// };
//
// function InputRefs(): React.ReactElement {
//
//     const form = useDendriform<ValidationPerson[]>([BLANK_PERSON]);
//     const addNew = useCallback(() => form.set(array.push(BLANK_PERSON)), []);
//
//     const [inputRefs, setInputRefs] = useState<InputRefsMap>({});
//
//     const useInputRef = (form) => {
//         const ref = useRef();
//         useEffect(() => {
//             if(ref.current) {
//                 setInputRefs(refs => ({
//                     ...refs,
//                     [form.id]: ref.current
//                 }));
//             }
//
//             return () => setInputRefs(refs => {
//                 const clonedRefs = {...refs};
//                 delete clonedRefs[form.id];
//                 return clonedRefs;
//             });
//         }, []);
//         return ref;
//     };
//
//     console.log('inputRefs', inputRefs);
//
//     return <Region>
//         {form.renderAll(form => {
//
//             const remove = useCallback(() => form.set(array.remove()), []);
//             const moveDown = useCallback(() => offsetElement(form, 1), []);
//             const moveUp = useCallback(() => offsetElement(form, -1), []);
//
//             return <Region>
//
//                 {form.render('name', form => <Region>
//                     <label>name: <input {...useInput(form, 150)} ref={useInputRef(form)} /></label>
//                 </Region>)}
//
//                 {form.render('age', form => <Region>
//                     <label>age: {' '}<input {...useInput(form, 150)} ref={useInputRef(form)} /></label>
//                 </Region>)}
//
//                 <button type="button" onClick={remove}>remove</button>
//                 <button type="button" onClick={moveDown}>down</button>
//                 <button type="button" onClick={moveUp}>up</button>
//             </Region>;
//         })}
//
//         <button type="button" onClick={addNew}>add new</button>
//     </Region>;
// }
//
// const InputRefsCode = ``;

//
// validation
//

type ValidationPerson = {
    name: string;
    age: string;
};

const BLANK_PERSON = {
    name: '',
    age: ''
};

type ValidationMap = {
    [id: string]: string;
};

type ValidationDisplayMap = {
    [id: string]: boolean;
};

function Validation(): React.ReactElement {

    const form = useDendriform<ValidationPerson[]>([BLANK_PERSON]);
    const addNew = useCallback(() => form.set(array.push(BLANK_PERSON)), []);

    // submit
    const [submitted, setSubmitted] = useState(false);

    // validation
    const errorMapForm = useDendriform<ValidationMap>({});
    const showErrorMapForm = useDendriform<ValidationDisplayMap>({});
    const errorListForm = useDendriform<string[]>([]);

    const updateValidation = useCallback(() => {
        const validationMap: ValidationMap = {};
        const errorList: string[] = [];
        const showErrorMap: ValidationDisplayMap = showErrorMapForm.value;

        form.branchAll().forEach(form => {
            const nameForm = form.branch('name');
            if(showErrorMap[nameForm.id] && nameForm.value === '') {
                validationMap[nameForm.id] = 'Name must not be blank';
                errorList.push(`Name #${form.index + 1} must not be blank`);
            }

            const ageForm = form.branch('age');
            if(showErrorMap[ageForm.id] && isNaN(parseFloat(ageForm.value))) {
                validationMap[ageForm.id] = 'Age must be numeric';
                errorList.push(`Age #${form.index + 1} must be numeric`);
            }
        });

        errorMapForm.set(validationMap);
        errorListForm.set(errorList);
    }, []);

    form.useDerive(() => updateValidation());

    const useError = useCallback((form) => {
        return errorMapForm.branch(form.id).useValue();
    }, []);

    const showError = useCallback((form) => {
        showErrorMapForm.branch(form.id).set(true);
    }, []);

    const onSubmit = useCallback((e) => {
        e.preventDefault();

        form.branchAll().forEach(form => {
            showError(form.branch('name'));
            showError(form.branch('age'));
        });

        updateValidation();

        if(errorListForm.value.length === 0) {
            setSubmitted(true);
            // eslint-disable-next-line no-console
            console.log('Submitting data:', form.value);
        }
    }, []);

    const handleBlur = useCallback((form) => () => {
        showError(form);
        updateValidation();
    }, []);

    return <Region>
        <form onSubmit={onSubmit}>
            {form.renderAll(form => {

                const remove = useCallback(() => form.set(array.remove()), []);
                const moveDown = useCallback(() => offsetElement(form, 1), []);
                const moveUp = useCallback(() => offsetElement(form, -1), []);

                return <Region>
                    {form.render('name', form => {
                        return <Region>
                            <label>name: <input {...useInput(form, 150)} onBlur={handleBlur(form)} /></label>
                            <Text fontSize="small">{useError(form)}</Text>
                        </Region>;
                    })}
                    {form.render('age', form => (
                        <Region>
                            <label>age: {' '}<input {...useInput(form, 150)} onBlur={handleBlur(form)} /></label>
                            <Text fontSize="small">{useError(form)}</Text>
                        </Region>
                    ))}

                    <button type="button" onClick={remove}>remove</button>
                    <button type="button" onClick={moveDown}>down</button>
                    <button type="button" onClick={moveUp}>up</button>
                </Region>;
            })}

            <button type="button" onClick={addNew}>add new</button>

            {errorListForm.render(form => {
                const errors = form.useValue();
                return <Region>
                    Errors:
                    <ul>
                        {errors.map((err, key) => <Region of="li" key={key}>{err}</Region>)}
                        {errors.length === 0 && <Region of="li">None</Region>}
                    </ul>
                </Region>;
            })}

            <button type="submit">submit</button>
            {submitted && <code>submitted</code>}
        </form>
    </Region>;
}

const ValidationCode = `
const offsetElement = (form, offset) => {
    return form.setParent(index => array.move(index, index + offset));
};

const BLANK_PERSON = {
    name: '',
    age: ''
};

function MyComponent(props) {
    const form = useDendriform([BLANK_PERSON]);
    const addNew = useCallback(() => form.set(array.push(BLANK_PERSON)), []);

    // submit
    const [submitted, setSubmitted] = useState(false);

    // validation
    const errorMapForm = useDendriform({});
    const showErrorMapForm = useDendriform({});
    const errorListForm = useDendriform([]);

    const updateValidation = useCallback(() => {
        const validationMap = {};
        const errorList = [];
        const showErrorMap: = showErrorMapForm.value;

        form.branchAll().forEach(form => {
            const nameForm = form.branch('name');
            if(showErrorMap[nameForm.id] && nameForm.value === '') {
                validationMap[nameForm.id] = 'Name must not be blank';
                errorList.push(\`Name #\${form.index + 1} must not be blank\`);
            }

            const ageForm = form.branch('age');
            if(showErrorMap[ageForm.id] && isNaN(parseFloat(ageForm.value))) {
                validationMap[ageForm.id] = 'Age must be numeric';
                errorList.push(\`Age #\${form.index + 1} must be numeric\`);
            }
        });

        errorMapForm.set(validationMap);
        errorListForm.set(errorList);
    }, []);

    form.useDerive(() => updateValidation());

    const useError = useCallback((form) => {
        return errorMapForm.branch(form.id).useValue();
    }, []);

    const showError = useCallback((form) => {
        showErrorMapForm.branch(form.id).set(true);
    }, []);

    const onSubmit = useCallback((e) => {
        e.preventDefault();

        form.branchAll().forEach(form => {
            showError(form.branch('name'));
            showError(form.branch('age'));
        });

        updateValidation();

        if(errorListForm.value.length === 0) {
            setSubmitted(true);
            console.log('Submitting data:', form.value);
        }
    }, []);

    const handleBlur = useCallback((form) => () => {
        showError(form);
        updateValidation();
    }, []);

    return <form onSubmit={onSubmit}>
        {form.renderAll(form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <>
                {form.render('name', form => {
                    return <>
                        <label>name: <input {...useInput(form, 150)} onBlur={handleBlur(form)} /></label>
                        {useError(form)}
                    </>;
                })}
                {form.render('age', form => (
                    <>
                        <label>age: <input {...useInput(form, 150)} onBlur={handleBlur(form)} /></label>
                        {useError(form)}
                    </>
                ))}

                <button type="button" onClick={remove}>remove</button>
                <button type="button" onClick={moveDown}>down</button>
                <button type="button" onClick={moveUp}>up</button>
            </>;
        })}

        <button type="button" onClick={addNew}>add new</button>

        {errorListForm.render(form => {
            const errors = form.useValue();
            return <>
                Errors:
                <ul>
                    {errors.map((err, key) => <li key={key}>{err}</li>)}
                    {errors.length === 0 && <li>None</li>}
                </ul>
            </>;
        })}

        <button type="submit">submit</button>
        {submitted && <code>submitted</code>}
    </form>;
}
`;

//
// set() track
//

function SetTrack(): React.ReactElement {

    const form = useDendriform(() => ({
        pets: [
            {name: 'Spike'},
            {name: 'Spoke'}
        ]
    }));

    const addPet = useCallback(() => {
        form.branch('pets').set(draft => {
            draft.push({name: 'new pet'});
        });
    }, []);

    const reverseStrict = useCallback(() => {
        form.set(draft => {
            draft.pets.reverse();
        });
    }, []);

    const reverseValue = useCallback(() => {
        form.set(draft => {
            // deliberately create new object references
            draft.pets = JSON.parse(JSON.stringify(draft.pets));
            draft.pets.reverse();
        });
    }, []);

    return <Region>
        <fieldset>
            <legend>pets</legend>

            <ul>
                {form.renderAll('pets', form => <Region of="li">
                    {form.render('name', form => (
                        <Region of="label">name <input {...useInput(form, 150)} /></Region>
                    ))}
                    <code>(id: {form.id})</code>
                </Region>)}
            </ul>

            <button type="button" onClick={addPet}>Add pet</button>
        </fieldset>
        <button type="button" onClick={reverseStrict}>Reverse pets with strictly equal array element object references (ids will track)</button>
        <button type="button" onClick={reverseValue}>Reverse pets with equal-by-value array element object references (ids won{"'"}t track)</button>
    </Region>;
}

const SetTrackCode = `
import React, {useCallback} from 'react';
import {useDendriform, useInput} from 'dendriform';

function MyComponent(props) {

    const form = useDendriform(() => ({
        pets: [
            {name: 'Spike'},
            {name: 'Spoke'}
        ]
    });

    const reverseStrict = useCallback(() => {
        form.set(draft => {
            draft.pets.reverse();
        });
    }, []);

    const reverseValue = useCallback(() => {
        form.set(draft => {
            // deliberately create new object references
            draft.pets = JSON.parse(JSON.stringify(draft.pets));
            draft.pets.reverse();
        });
    }, []);

    return <div>
        <fieldset>
            <legend>pets</legend>
            <ul>
                {form.renderAll('pets', form => <li>
                    {form.render('name', form => (
                        <label>name <input {...useInput(form, 150)} /></label>
                    ))}
                    <code>(id: {form.id})</code>
                </li>)}
            </ul>
            <button type="button" onClick={addPet}>Add pet</button>
        </fieldset>
        <button type="button" onClick={reverseStrict}>Reverse pets with strictly equal array element object references (ids will track)</button>
        <button type="button" onClick={reverseValue}>Reverse pets with equal-by-value array element object references (ids won't track)</button>
    </div>;
};
`;

//
// region
//

type RegionProps = {
    children: React.ReactNode;
    className: string;
    of?: string;
};

const MAX_FLASH_CLASSES = 20;
let flashCss = '';
for(let i = 0; i < MAX_FLASH_CLASSES; i++) {
    flashCss += `
        &.flash${i} {animation: Flash${i} 0.5s linear;}
        @keyframes Flash${i} {0% { background-color: rgba(255,255,255,0.05); } 100% { background-color: rgba(255,255,255,0);}};
    `;
}

const Region = styled((props: RegionProps): React.ReactElement => {
    const {children, className, of = 'div'} = props;

    const flash = useRef(1);
    flash.current = (flash.current += 1) % MAX_FLASH_CLASSES;

    const Comp = of || 'div';
    // eslint-disable-next-line  @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <Comp className={`${className} flash${flash.current}`}>{children}</Comp>;
})`
    padding: .25rem;
    ${flashCss}
`;

//
// demo
//

type DemoObject = {
    title: string;
    description?: string;
    Demo: React.ComponentType<Record<string, unknown>>;
    code: string;
    anchor: string;
    more?: string;
};

const DEMOS: DemoObject[] = [
    {
        title: 'A quick example',
        Demo: FirstExample,
        code: FirstExampleCode,
        anchor: 'example',
        description: `This demonstrates a basic form with several fields, rendering, and array elements. Changes are subscribed to and logged to the console.`,
        more: 'dendriform'
    },
    {
        title: 'Dendriform instance outside of React',
        Demo: OutsideReactContainer,
        code: OutsideReactCode,
        anchor: 'outside',
        description: `Dendriform instances can be kept outside of React. Notice how the state is preserved regardless of whether the component is mounted.`,
        more: 'creation'
    },
    {
        title: 'Branching forms',
        Demo: Branching,
        code: BranchingCode,
        anchor: 'branch',
        description: `Here .branch() is used to access parts of a data shapes, which are returned as their own smaller forms. Changes made to these smaller forms are also made to the original form.`,
        more: 'branching'
    },
    {
        title: 'Rendering fields',
        Demo: Rendering,
        code: RenderingCode,
        anchor: 'render',
        description: `The .render() function is used to render parts of a form into small performant components. The white flashes indicate regions of the page that React has re-rendered. You can see how performant Dendriform's rendering is by how localised these flashes are.`,
        more: 'rendering'
    },
    {
        title: 'Rendering with dependencies',
        Demo: RenderingDeps,
        code: RenderingDepsCode,
        description: `This demonstrates how .render() can be forced to update in response to other prop changes.`,
        anchor: 'renderdeps',
        more: 'rendering'
    },
    {
        title: 'Setting data',
        Demo: SettingData,
        code: SettingDataCode,
        description: `This demo shows how to set data in a form in various ways: by passing the value, by using an updater function, and by using an immer producer.`,
        anchor: 'set',
        more: 'setting-data'
    },
    {
        title: 'Setting data with buffering',
        Demo: SettingDataBuffer,
        code: SettingDataBufferCode,
        description: `This demonstrates how multiple changes can be collected and applied at once. View the console to see how many changes are produced by each button click.`,
        anchor: 'buffer',
        more: 'setting-data'
    },
    {
        title: 'Setting data with debouncing',
        Demo: SettingDataDebounce,
        code: SettingDataDebounceCode,
        description: `This demonstrates how set() calls can be debounced. Click the buttons below rapidly and watch how the value updates more slowly.`,
        anchor: 'debounce',
        more: 'debounce'
    },
    {
        title: 'ES6 classes',
        Demo: ES6Classes,
        code: ES6ClassesCode,
        description: `A demonstration of how to use ES6 classes with dendriform.`,
        anchor: 'es6-classes',
        more: 'es6-classes'
    },
    {
        title: 'ES6 maps',
        Demo: ES6Maps,
        code: ES6MapsCode,
        description: `A demonstration of how to use ES6 maps with dendriform.`,
        anchor: 'es6-maps',
        more: 'es6-maps'
    },
    {
        title: 'Form inputs',
        Demo: FormInputs,
        code: FormInputsCode,
        description: `Here different types of form input elements are bound to different forms. Note that useInput and useCheckbox are React hooks and as such must follow the rules of hooks.`,
        anchor: 'inputs',
        more: 'form-inputs'
    },
    {
        title: 'Subscribing to changes',
        Demo: Subscribe,
        code: SubscribeCode,
        description: `Subscribing to changes using useChange(). Open the console to see these changes occur.`,
        anchor: 'subscribe',
        more: 'subscribing-to-changes'
    },
    {
        title: 'Array operations',
        Demo: ArrayOperations,
        code: ArrayOperationsCode,
        description: `This shows how to use the array methods to manipulate arrays. If you're interested in rendering arrays of items, there is also a drag and drop demo that can provide a better user experience.`,
        anchor: 'array',
        more: 'array-operations'
    },
    {
        title: 'Array indexes',
        Demo: ArrayIndexes,
        code: ArrayIndexesCode,
        description: `This shows how to access array element indexes and respond to their changes. See how this incresases the amount of component updates required.`,
        anchor: 'indexes',
        more: 'array-operations'
    },
    {
        title: 'Array element tracking',
        Demo: SetTrack,
        code: SetTrackCode,
        description: `This demonstrates how Dendriform uses strict equality to track array element movement over time, which it uses for React element keying.`,
        anchor: 'set-track'
    },
    {
        title: 'History',
        Demo: History,
        code: HistoryCode,
        description: `A simple demonstration of history with undo and redo.`,
        anchor: 'history',
        more: 'history'
    },
    {
        title: 'Grouping history items',
        Demo: GroupingHistoryItems,
        code: GroupingHistoryItemsCode,
        description: `Shows how you can control how changes are grouped within the history stack. Use any of the buttons, and then use undo and redo to see how the changes are grouped within history.`,
        anchor: 'historygroup',
        more: 'history'
    },
    {
        title: 'Drag and drop with react-beautiful-dnd',
        Demo: DragAndDrop,
        code: DragAndDropCode,
        description: `An example of how one might implement drag and drop with react-beautiful-dnd. Dendriform's .renderAll() function, and its automatic id management on array elements simplifies this greatly.`,
        anchor: 'draganddrop',
        more: 'drag-and-drop'
    }
];

const PLUGIN_DEMOS: DemoObject[] = [
    {
        title: 'Submit Plugin (PluginSubmit)',
        Demo: PluginSubmitExample,
        code: PluginSubmitExampleCode,
        description: `The submit plugin gives a form the ability to have a submit action, and to track what has changed between the current form state and the last time it was submitted. The asterisks denote that a field has changed.`,
        anchor: 'pluginsubmit',
        more: 'pluginsubmit'
    }
];

const ADVANCED_DEMOS: DemoObject[] = [
    {
        title: 'Validation example',
        Demo: Validation,
        code: ValidationCode,
        description: `An example of how it's possible to perform validation on an array of items.`,
        anchor: 'validation'
    },
    {
        title: 'Deriving data in a single form',
        Demo: Deriving,
        code: DerivingCode,
        description: `The .useDerive() hook is used to set the value of one property in response to the value of other properties.`,
        anchor: 'derive',
        more: 'deriving-data'
    },
    {
        title: 'Deriving data in another form',
        Demo: DerivingOther,
        code: DerivingOtherCode,
        description: `It is also possible and often preferrable to make changes in other forms in .onDerive()'s callback. Here we can see that deriving data can be useful for implementing validation. Try deleting all the characters in the name below.`,
        anchor: 'deriveother',
        more: 'deriving-data'
    },
    {
        title: 'Synchronising forms',
        Demo: Sync,
        code: SyncCode,
        description: 'When forms are synchronised with each other, their changes throughout history are also synchronised. Type in either input and use undo and redo to see how the two forms are connected.',
        anchor: 'sync',
        more: 'synchronising-forms'
    },
    {
        title: 'Synchronising forms with deriving',
        Demo: SyncDerive,
        code: SyncDeriveCode,
        description: `The useSync() hook can also accept a deriver to derive data in one direction.  This has the effect of caching each derived form state in history, and calling undo and redo will just restore the relevant derived data at that point in history.`,
        anchor: 'syncderive',
        more: 'synchronising-forms'
    },
    {
        title: 'Cancel changes based on constraints',
        Demo: Cancel,
        code: CancelCode,
        description: `The callbacks provided to onDerive() can cancel and revert the change that is being currently applied. The .useCancel() callback is called whenever a change is cancelled. This example does not permit negative numbers in the form.`,
        anchor: 'cancel',
        more: 'cancel-changes-based-on-constraints'
    },
    {
        title: 'Foreign key constraints',
        Demo: ForeignKey,
        code: ForeignKeyCode,
        description: `In this demo the cancel feature is used to set up data integrity constraints between forms. Try removing a colour that is being referenced by a person. Calls to remove a colour that is referenced will be cancelled, and calls to forcefully remove a colour will cascade the deletion, removing all people currently referencing the removed colour and maintaining relational integrity.`,
        anchor: 'foreign-key',
        more: 'cancel-changes-based-on-constraints'
    }
//    {
//        title: 'Keeping track of input refs',
//        Demo: InputRefs,
//        code: InputRefsCode,
//        description: `It's possible to use Dendriform forms to store refs to inputs being rendered. This allows you to access the refs from outside of the local component instances, which is particularly useful for focus management.`,
//        anchor: 'refs'
//    },
];

export function Demos(): React.ReactElement {
    return <Flex flexWrap="wrap">
        {DEMOS.map(demo => <Demo demo={demo} key={demo.anchor} />)}
    </Flex>;
}

export function PluginDemos(): React.ReactElement {
    return <Flex flexWrap="wrap">
        {PLUGIN_DEMOS.map(demo => <Demo demo={demo} key={demo.anchor} />)}
    </Flex>;
}

export function AdvancedDemos(): React.ReactElement {
    return <Flex flexWrap="wrap">
        {ADVANCED_DEMOS.map(demo => <Demo demo={demo} key={demo.anchor} />)}
    </Flex>;
}

type DemoProps = {
    demo: DemoObject
};

function Demo(props: DemoProps): React.ReactElement {
    const {Demo, title, anchor, code, description, more} = props.demo;

    const [expanded, setExpanded] = useState(false);
    const toggleExpanded = useCallback(() => {
        setExpanded(e => !e);
    }, []);

    const content = <Box maxWidth="25rem">
        <Flex pb={3}>
            <Box mr={2}><H2 id={anchor} onClick={toggleExpanded} style={{cursor: 'pointer'}}>{title}</H2></Box>
            <Box flexShrink="0"><Text style={{lineHeight: "1.9rem"}} fontSize="smaller"><Link onClick={toggleExpanded}>{expanded ? 'minimise' : 'show code'}</Link></Text></Box>
        </Flex>
        <Box mb={4}>
            <Text fontSize="smaller">
                {description} {more && <Link title="To the documentation" href={`https://github.com/92green/dendriform#${more}`}>docs {'>'}</Link>}
            </Text>
        </Box>
        <DemoStyle>
            <Demo />
        </DemoStyle>
    </Box>;

    return <DemoBox expanded={expanded}>
        <DemoPad>
            {!expanded && content}
            {expanded &&
                <Flex display={['block', 'flex']}>
                    <Box flexShrink="0">{content}</Box>
                    <Box ml={[0,4]} flexGrow="1" flexShrink="1" style={{minWidth: 0}}>
                        <Code code={code} />
                    </Box>
                </Flex>
            }
        </DemoPad>
    </DemoBox>;
}

type DemoBoxProps = {
    expanded: boolean;
} & ThemeProps;

const DemoBox =  styled.div<DemoBoxProps>`
    background-color: ${(props: ThemeProps) => props.theme.colors.background};
    width: 100%;

    ${(props: DemoBoxProps) => props.expanded
        ? `
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 100;
            padding: 1rem;
            overflow: auto;
        `
        : `
            margin-right: 2rem;
            margin-bottom: 2rem;
            max-width: 25rem;
        `}
`;

const DemoStyle = styled.div`
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

const DemoPad =  styled.div`
    background-color: ${(props: ThemeProps) => props.theme.colors.backgroundLight};
    padding: 1rem;
`;


type CodeProps = {
    code: string;
    className: string;
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
        <code>{code.substr(1)}</code>
    </pre>;
})`
    font-family: ${(props: ThemeProps) => props.theme.fonts.mono};
    color: ${(props: ThemeProps) => props.theme.colors.code};
    font-size: 14px;
    line-height: 1.4em;
    background-color: ${(props: ThemeProps) => props.theme.colors.background};

    display: block;
        overflow: auto;
        padding: 1rem;

    code {

    }
`;
