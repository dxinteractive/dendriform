import {useCallback, useEffect, useState, useRef, memo} from 'react';
import {Dendriform, useDendriform, useInput, useCheckbox, useSync, array, immerable} from 'dendriform';
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

            <button onClick={addPet}>Add pet</button>
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
            <button onClick={toggleShow}>Unmount</button>
        </Region>;
    }

    return <Region>
        <button onClick={toggleShow}>Remount</button>
    </Region>;
}

const OutsideReact = memo(function OutsideReact(): React.ReactElement {
    const value = persistentForm.useValue();
    const addOne = useCallback(() => persistentForm.set(value => value + 1), []);

    return <Region>
        <code>Value: {value}</code>
        <button onClick={addOne}>Add 1</button>
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

        <button onClick={set100}>set value to 100</button>
        <button onClick={add3}>add 3 to value</button>
        <button onClick={add6immer}>add 6 to value with immer producer</button>
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

        <button onClick={add3nobuffer}>add 1, 3 times without buffering</button>
        <button onClick={add3buffer}>add 1, 3 times with buffering</button>
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

        <button onClick={add3nobuffer}>add 1, 3 times without buffering</button>
        <button onClick={add3buffer}>add 1, 3 times with buffering</button>
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

const offsetElement = <T,>(form: Dendriform<T,unknown>, offset: number): void => {
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

                <button onClick={remove}>remove</button>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </Region>;
        })}
        <button onClick={shift}>shift</button>
        <button onClick={pop}>pop</button>
        <button onClick={unshift}>unshift</button>
        <button onClick={push}>push</button>
        <button onClick={move}>move last to first</button>
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

                <button onClick={remove}>remove</button>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </div>;
        })}

        <button onClick={shift}>shift</button>
        <button onClick={pop}>pop</button>
        <button onClick={unshift}>unshift</button>
        <button onClick={push}>push</button>
        <button onClick={move}>move last to first</button>
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
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
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
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
                <button onClick={() => form.go(-3)} disabled={!canUndo}>Undo 3</button>
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

        <button onClick={add}>Add history item</button>
        <button onClick={addMulti}>Add 3 history items</button>
        <button onClick={replace}>Replace history item</button>

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            return <Region>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
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
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
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
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
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
            <button onClick={addName}>Add name</button>
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
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
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
            return <>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
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
        <button onClick={onAdd}>add new</button>
    </Region>;
}

type DragAndDropListProps = {
    form: Dendriform<string[],unknown>;
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
                    <button onClick={remove}>remove</button>
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

        <button onClick={push}>add new</button>
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
                <button onClick={remove}>remove</button>
            </div>}
        </Draggable>;
    });
}
`;

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
    all: string[];
    [id: string]: string;
};

function Validation(): React.ReactElement {

    const form = useDendriform<ValidationPerson[]>([BLANK_PERSON]);
    const addNew = useCallback(() => form.set(array.push(BLANK_PERSON)), []);

    // validation
    const validationForm = useDendriform<ValidationMap>({all: []});
    form.useDerive(() => {
        const validationMap: ValidationMap = {all: []};

        form.branchAll().forEach(form => {
            const nameForm = form.branch('name');
            if(nameForm.value === '') {
                validationMap[nameForm.id] = 'Name must not be blank';
                validationMap.all.push(`Name #${form.index + 1} must not be blank`);
            }

            const ageForm = form.branch('age');
            if(isNaN(parseFloat(ageForm.value))) {
                validationMap[ageForm.id] = 'Age must be numeric';
                validationMap.all.push(`Age #${form.index + 1} must be numeric`);
            }
        });

        validationForm.set(validationMap);
    });

    return <Region>
        {form.renderAll(form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <Region>
                {form.render('name', form => {
                    return <Region>
                        <label>name: <input {...useInput(form, 150)} /></label>
                        <Text fontSize="small">{validationForm.branch(form.id).useValue()}</Text>
                    </Region>;
                })}
                {form.render('age', form => (
                    <Region>
                        <label>age: {' '}<input {...useInput(form, 150)} /></label>
                        <Text fontSize="small">{validationForm.branch(form.id).useValue()}</Text>
                    </Region>
                ))}

                <button onClick={remove}>remove</button>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </Region>;
        })}
        <button onClick={addNew}>add new</button>

        {validationForm.render('all', form => {
            const errors = form.useValue();
            return <Region>
                Errors:
                <ul>
                    {errors.map((err, key) => <Region of="li" key={key}>{err}</Region>)}
                    {errors.length === 0 && <Region of="li">None</Region>}
                </ul>
            </Region>;
        })}
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

    // validation
    const validationForm = useDendriform({all: []});
    form.useDerive(() => {
        const validationMap = {all: []};

        form.branchAll().forEach(form => {
            const nameForm = form.branch('name');
            if(nameForm.value === '') {
                validationMap[nameForm.id] = 'Name must not be blank';
                validationMap.all.push(\`Name #\${form.index + 1} must not be blank\`);
            }

            const ageForm = form.branch('age');
            if(isNaN(parseFloat(ageForm.value))) {
                validationMap[ageForm.id] = 'Age must be numeric';
                validationMap.all.push(\`Age #\${form.index + 1} must be numeric\`);
            }
        });

        validationForm.set(validationMap);
    });

    return <>
        {form.renderAll(form => {

            const remove = useCallback(() => form.set(array.remove()), []);
            const moveDown = useCallback(() => offsetElement(form, 1), []);
            const moveUp = useCallback(() => offsetElement(form, -1), []);

            return <>
                {form.render('name', form => {
                    return <>
                        <label>name: <input {...useInput(form, 150)} /></label>
                        <Text fontSize="small">{validationForm.branch(form.id).useValue()}</Text>
                    </>;
                })}
                {form.render('age', form => (
                    <>
                        <label>age: {' '}<input {...useInput(form, 150)} /></label>
                        <Text fontSize="small">{validationForm.branch(form.id).useValue()}</Text>
                    </>
                ))}

                <button onClick={remove}>remove</button>
                <button onClick={moveDown}>down</button>
                <button onClick={moveUp}>up</button>
            </>;
        })}
        <button onClick={addNew}>add new</button>

        {validationForm.render('all', form => {
            const errors = form.useValue();
            return <>
                Errors:
                <ul>
                    {errors.map((err, key) => <li key={key}>{err}</li>)}
                    {errors.length === 0 && <li>None</li>}
                </ul>
            </>;
        })}
    </>;
}
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
        title: 'Drag and drop with react-beautiful-dnd',
        Demo: DragAndDrop,
        code: DragAndDropCode,
        description: `An example of how one might implement drag and drop with react-beautiful-dnd. Dendriform's .renderAll() function, and its automatic id management on array elements simplifies this greatly.`,
        anchor: 'draganddrop',
        more: 'drag-and-drop'
    },
    {
        title: 'Validation example',
        Demo: Validation,
        code: ValidationCode,
        description: `An example of how it's possible to perform validation on an array of items.`,
        anchor: 'validation'
    }
];

export function Demos(): React.ReactElement {
    return <Flex flexWrap="wrap">
        {DEMOS.map(demo => <Demo demo={demo} key={demo.anchor} />)}
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
