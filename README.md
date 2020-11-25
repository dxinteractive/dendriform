# dendriform

[![npm](https://img.shields.io/npm/v/dendriform.svg)](https://www.npmjs.com/package/dendriform) ![Master build](https://github.com/92green/dendriform/workflows/CI/badge.svg?branch=master) ![Maturity: Early Days](https://img.shields.io/badge/Maturity-Early%20days-yellow) ![Coolness Reasonable](https://img.shields.io/badge/Coolness-Reasonable-blue) 

Build feature-rich data-editing React UIs with great performance and not much code.

```js
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
        console.log('form changed:', value);
    });

    const addPet = useCallback(() => {
        form.branch('pets').set(draft => {
            draft.push({name: 'new pet'});
        });
    }, []);

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(['address', 'street'], street => (
            <label>street: <input {...useInput(street, 150)} /></label>
        ))}

        <fieldset>
            <legend>pets:</legend>

            {form.renderAll('pets', form => (
                <div>
                    {form.render('name', form => (
                        <label>name: <input {...useInput(form, 150)} /></label>
                    ))}
                </div>
            ))}

            <button onClick={addPet}>Add pet</button>
        </fieldset>
    </div>;
};
```

## Installation

```bash
yarn add dendriform
// or
npm install --save dendriform
```

## Usage and API

### Creation

Create a new dendriform form using `new Dendriform()`, or by using the `useDendriform()` hook if you're inside a React component's render method. Pass it the initial value to put in the form, or a function that returns your initial value.

The `useDendriform()` hook on its own will never cause a stateful update to the component it's in; the hook just returns an unchanging reference to a Dendriform instance.

```js
import {Dendriform, useDendriform} from 'dendriform';
// ...

const form = new Dendriform({name: 'Bill'});
// ...

function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});
    // ...
}
```

If you're using Typescript you can pass type information in here.

```js
type FormValue = {
    name?: string;
};

const form = new Dendriform<FormValue>({name: 'Bill'});
// ...

function MyComponent(props) {
    const form = useDendriform<FormValue>({name: 'Ben'});
    // ...
}
```

### Values

Access your form's value using `.value`, or by using the `.useValue()` hook if you're inside a React component's render method. The `.useValue()` hook will cause a component to update whenever the value changes. Using the hook essentially allows your components to "opt in" to respond to specific value changes, which means that unnecessary component updates can be easily avoided, and is a large part of what makes Dendriform so performant.

```js
const form = new Dendriform({name: 'Bill'});
const value = form.value;
// value is {name: 'Bill'}
// ...

function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});
    const [value, setValue] = form.useValue();
    // value is {name: 'Ben'}
    // ...
}
```

You can instantiate forms outside of React, and access them and change them inside React components - they work in just the same way.

The only difference is that the lifespan of forms instantiated inside React components will be tied to the lifespan of the component instances they appear in.

```js
const persistentForm = new Dendriform({name: 'Bill'});

function MyComponent(props) {
    const [value, setValue] = persistentForm.useValue();
    // value is {name: 'Bill'}
    // ...
}
```

### Branching

Use `.branch()` to deeply access parts of your form's value. This returns another form, containing just the deep value.

```js
const form = new Dendriform({name: 'Bill'});

const nameForm = form.branch('name');
const value = nameForm.value;
// value is 'Bill'
// ...

function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});

    const nameForm = form.branch('name');
    const [value, setValue] = nameForm.useValue();
    // value is 'Ben'
    // ...
}
```

### Rendering

The `.render()` function allows you to branch off and render a deep value in a React component.

The `.render()` function's callback is rendered as it's own component instance, so you can use hooks in it. It's optimised for performance and by default it only ever updates if the deep value changes *and* the value is being accessed with a `.useValue()` hook, *or* it contains some changing state of its own. 

```js
function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});

    return <div>
        {form.render('name', form => {
            const [name, setName] = form.useValue();
            return <div>My name is {name}</div>;
        })}
    </div>;
}
```

The `.renderAll()` function works in the same way, but repeats for all elements in an array. React keying is taken care of for you.

See [Array operations](#Array operations) for convenient ways to let the user manipulate arrays of items.

```js
function MyComponent(props) {
    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {
            const [colour, setColour] = form.useValue();
            return <div>Colour: {colour}</div>;
        })}
    </div>;
}
```

Array element forms can also opt-in to updates regarding their indexes using the `.useIndex()` hook.

If you'll be allowing users to re-order items in an array, then please note that you'll get better performance if array element components don't know about their indexes. If the `.useIndex()` hook is used, a element that has moved its position inside of its parent array will need to update, even if it is otherwise unchanged.

```js
function MyComponent(props) {
    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {
            const [colour, setColour] = form.useValue();
            const index = form.useIndex();

            return <div>Colour: {colour}, index: {index}</div>;
        })}
    </div>;
}
```

Branch and render functions can all accept arrays of properties to dive deeply into data structures.

```js
const form = new Dendriform({
    pets: [
        {name: 'Spike'}
    ]
});

const petName = form.branch(['pets', 0, 'name']);
// petName.value is 'Spike'
```

Render functions (`.render()` and `.renderAll()`) can also additionally accept an array of dependencies that will cause them to update in response to prop changes.

```js
function MyComponent(props) {
    const {time} = props;
    const form = useDendriform({name: 'Ben'});

    return <div>
        {form.render('name', form => {
            const [name, setName] = form.useValue();
            return <div>My name is {name} and the time is {time}</div>;
        }, [time])}
    </div>;
}
```

### Setting data

You can set data directly using `.set()`. This accepts the new value for the form. When called, changes will momentarily be applied to the data in the form and any relevant `.useValue()` hooks and `.render()` methods will be updated.

```js
const form = new Dendriform('Foo');
form.set('Bar');
// form.value will update to become 'Bar'
```

In a React component, the `.useValue()` hook provides the `.set()` function as the second element of the tuple it returns.

```js
function MyComponent(props) {
    const form = useDendriform('Foo');

    const [value, setValue] = name.useValue(); 

    const setToBar = useCallback(() => setValue('Bar'), []);

    return <div>
        Current value: {value}

        <button onClick={setToBar}>Set to Bar</button>
    </div>;
}
```

When `.set()` is called on a deep form, the deep value will be updated immutably within its parent data shape. It uses structural sharing, so other parts of the data shape that haven't changed will not be affected.

```js
function MyComponent(props) {
    const form = useDendriform({name: 'Ben', age: 30});

    return <div>
        {form.render('name', form => {
            const [name, setName] = form.useValue();
            const setToBill = useCallback(() => {
                setName('Bill');
            }, []);

            return <div>
                My name is {name}
                <button onClick={setToBill}>Set to Bill</button>
            </div>;
        })}
    </div>;

    // clicking 'Set to Bill' will cause the form to update
    // and form.value will become {name: 'Bill', age: 30}
}
```

The `.set()` function can also accept an [Immer producer](https://immerjs.github.io/immer/docs/introduction).

```js
function MyComponent(props) {
    const form = useDendriform({count: 0});

    const countUp = useCallback(() => {
        form.set(draft => {
            draft.count++;
        });
    }, []);

    return <div>
        {form.render('count', form => {
            const [count] = form.useValue();
            return <div>Count: {count}</div>;
        })}

        <button onClick={countUp}>Count up</button>
    </div>;
}
```

### Form inputs

You can easily bind parts of your data to form inputs using `useInput()` and `useCheckbox()`. The props they return can be spread onto form elements. A debounce value (milliseconds) can also be provided to `useInput()` to prevent too many updates happening in a short space of time.

Internally these function use React hooks, so also must follow React's rules of hooks.

```js
import {useDendriform, useInput, useCheckbox} from 'dendriform';

function MyComponent(props) {

    const form = useDendriform(() => ({
        name: 'Bill',
        fruit: 'grapefruit',
        canSwim: true
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
    </div>;
};
```

### Subscribing to changes

You can subscribe to changes using `.onChange`, or by using the `.useChange()` hook if you're inside a React component's render method.

The `.onChange()` method returns an unsubscribe function you can call to stop listening to changes. The `.useChange()` hook automatically unsubscribes when the component unmounts, so it returns nothing.

```js
const form = new Dendriform({name: 'Bill'});

const unsubscribe = form.onChange(newValue => {
    console.log('form value was updated:', newValue);
});

// call unsubscribe() to unsubscribe

function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});

    form.useChange(newValue => {
        console.log('form value was updated:', newValue);
    });

    // ...
}
```

As these functions can be called on any form instance, including branched form instances, you can selectively and independently listen to changes in parts of a form's data shape.

```js
function MyComponent(props) {

    const form = useDendriform(() => ({
        firstName: 'Bill',
        lastName: 'Joe'
    });

    useEffect(() => {
        const unsub1 = form
            .branch('firstName')
            .onChange(newName => {
                console.log('first name changed:', newName);
            });

        const unsub2 = form
            .branch('lastName')
            .onChange(newName => {
                console.log('last name changed:', newName);
            });

        return () => {
            unsub1();
            unsub2();
        };
    }, []);

    return <div>
        {form.render('firstName', form => (
            <label>first name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render('lastName', form => (
            <label>last name: <input {...useInput(form, 150)} /></label>
        ))}
    </div>;
};
```

### Array operations

Common array operations can be performed using `array`.

```js
import {useDendriform, useInput, array} from 'dendriform';

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
            const unshift = useCallback(() => form.set(array.unshift('New')), []);
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
```





## Development

This library is written and maintained by [Damien Clarke](https://damienclarke.me/), with feedback from others at [92green](https://github.com/92green). All online library discussion happens over on [Github](https://github.com/92green/dendriform).

I hope this library helps solve some data-editing user interface problems for you. 🎉
