<img align="right" width="100" height="100" src="https://user-images.githubusercontent.com/345320/110258298-09524100-7ff6-11eb-84b1-468e747d1261.png">


# dendriform

[![npm](https://img.shields.io/npm/v/dendriform.svg)](https://www.npmjs.com/package/dendriform) ![Master build](https://github.com/92green/dendriform/workflows/CI/badge.svg?branch=master) ![Maturity: Early Days](https://img.shields.io/badge/Maturity-Early%20days-yellow) ![Coolness Reasonable](https://img.shields.io/badge/Coolness-Reasonable-blue) 



Build feature-rich data-editing React UIs with great performance and little code.

**[See the demos](http://dendriform.xyz)**

*Available on npm only as pre-release for now. All docs refer to the upcoming version 2.0.0.*

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
```

[Demo](http://dendriform.xyz#example)

- [What does it do?](#what-does-it-do)
- [Installation](#installation)
- [Usage and API](#usage-and-api)
- [Etymology](#etymology)
- [Development](#development)
- [Demos](#demos)

## What does it do?

Dendriform is kind of like a very advanced `useState()` hook that:

- Stores state
  - see [creation](#creation) and [values](#values)
- Allows deep values in state to be accessed and set independently
  - see [branching](#branching) and [setting data](#setting-data)
- Coordinates component updates in a more perfomant way than `useState()` typically does
  - see [rendering](#rendering)
- Has convenient input binding and change debouncing
  - see [form inputs](#form-inputs)
- Has undo and redo out of the box
  - see [history (undo and redo)](#history)
- Handles editing arrays of items with ease
  - see [array operations](#array-operations) and [drag and drop](#drag-and-drop)
- Freezes state objects to prevent accidental editing, and only updates parts of the data shape that change
  - [thanks Immer!](https://immerjs.github.io/immer/)
- Supports concurrent editing because it produces patches
  - [thanks again Immer!](https://immerjs.github.io/immer/patches)
- Support for ES6 class and ES6 Maps
  - see [ES6 classes](#es6-classes) and [ES6 maps](#es6-maps)
- Can exist outside of React
  - see [creation](#creation) again
- Can be subscribed to
  - see [subscribing to changes](#subscribing-to-changes)
- Can automatically derive data in other forms
  - see [synchronising forms](#synchronising-forms)
- Comes with demos and recipes for building forms and data-editing user interfaces
  - see [the demos](http://dendriform.xyz) 

It's not a traditional "web form" library that has fields, validation and a submit mechanism all ready to go, although you can certainly build that with dendriform. If you want a traditional web form then [formik](https://formik.org/) will likely suit your needs better. Dendriform is less specific and far more adaptable, to be used to make entire UIs where allowing the user to edit data is the goal. You get full control over the behaviour of the interface you create, with many of the common problems already solved, and none of the boilerplate.

## Installation

```bash
yarn add dendriform
// or
npm install --save dendriform
```

## Usage and API

- [Creation](#creation)
- [Values](#values)
- [Branching](#branching)
- [Rendering](#rendering)
- [Rendering arrays](#rendering-arrays)
- [Setting data](#setting-data)
- [ES6 classes](#es6-classes)
- [ES6 maps](#es6-maps)
- [Dates and other non-immerable data](#dates-and-other-non-immerable-data)
- [Form inputs](#form-inputs)
- [Subscribing to changes](#subscribing-to-changes)
- [Array operations](#array-operations)
- [History](#history)
- [Synchronising forms](#synchronising-forms)
- [Drag and drop](#drag-and-drop)

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

The value can be of any type, however only plain objects, arrays, [ES6 classes](#es6-classes) and [ES6 maps](#es6-maps) will be able to use [branching](#branching) to access and modify child values.

### Values

Access your form's value using `.value`, or by using the `.useValue()` hook if you're inside a React component's render method. The `.useValue()` hook will cause a component to update whenever the value changes. Using the hook essentially allows your components to "opt in" to respond to specific value changes, which means that unnecessary component updates can be easily avoided, and is a large part of what makes Dendriform so performant.

```js
const form = new Dendriform({name: 'Bill'});
const value = form.value;
// value is {name: 'Bill'}
// ...

function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});
    const value = form.useValue();
    // value is {name: 'Ben'}
    // ...
}
```

You can instantiate forms outside of React, and access them and change them inside React components - they work in just the same way.

The only difference is that the lifespan of forms instantiated inside React components will be tied to the lifespan of the component instances they appear in.

```js
const persistentForm = new Dendriform({name: 'Bill'});

function MyComponent(props) {
    const value = persistentForm.useValue();
    // value is {name: 'Bill'}
    // ...
}
```

Accessing values in callbacks is very easy compared to using vanilla React hooks; simply call `form.value` in your callback. As `form` is an unchanging reference to a form, you do not have to add extra dependencies to your `useCallback()` hook, and `form.value` will _always_ return the current value, not a stale one.

```js
function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});

    const handleNameAlert = useCallback(() => {
        alert(form.value);
    }, []);

    return <button onClick={handleNameAlert}>
        Alert my name
    </button>;
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
    const value = nameForm.useValue();
    // value is 'Ben'
    // ...
}
```

[Demo](http://dendriform.xyz#branch)

### Rendering

The `.render()` function allows you to branch off and render a deep value in a React component.

The `.render()` function's callback is rendered as its own component instance, so you are allowed to use hooks in it. It's optimised for performance and by default it only ever updates if the deep value changes *and* the value is being accessed with a `.useValue()` hook, *or* it contains some changing state of its own. This keeps component updates to a minimum.

This act of 'opting-in' to reacting to data changes is similar to [mobx](https://mobx.js.org/), and is in contrast to React's default behaviour which is to make the developer 'opt-out' of component updates by using `React.memo`.

Sometimes using `useState()` you might need to raise the `useState()` hook further up the component heirarchy so that something higher up can set state. But this can then cause much larger parts of the React component heirarchy to be updated in response to those state changes, depending on how much use of `React.memo` you have.

With Dendriform, your state can be moved as high up the component heirarchy as you need, or even outside the component heirarchy, without accidentally causing larger parts of the React component heirarchy to update. And unlike [redux](https://redux.js.org/), you don't have to also put your state into a centralised data store if it doesn't belong there.

```js
function MyComponent(props) {
    // this component will never need to update, because 'form'
    // is an unchanging reference to a dendriform instance

    const form = useDendriform({name: 'Ben'});

    return <div>
        {form.render('name', form => {
            // this component will update whenever 'name' changes,
            // and only because the useValue() hook is used.
            // the useValue() hook tells this component
            // to opt-in to 'name' changes

            const name = form.useValue();
            return <div>My name is {name}</div>;
        })}
    </div>;
}
```

[Demo](http://dendriform.xyz#render)

The `.render()` function can also be called without branching.

```js
function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});

    return <div>
        {form.render(form => {
            // the 'form' passed into this component is the same
            // as the 'form' belonging to the parent component

            const [user, setUser] = form.useValue();
            return <div>My name is {user.name}</div>;
        })}
    </div>;
}
```

The `form` passed into the `render()` callback is provided just for convenience of writing less code while branching and rendering. The following examples are equivalent. You can use whichever suits:

```js
form.render('name', form => {
    const name = form.useValue();
    return <div>My name is {name}</div>;
});

form.render(form => {
    const name = form.branch('name').useValue();
    return <div>My name is {name}</div>;
});

form.render('name', form => <div>My name is {form.useValue()}</div>);

form.render(() => {
    const name = form.branch('name').useValue();

    // ^ this is essentially the same as example 2.
    // the 'form' being accessed is the form in the parent component
    // which is fine do to because forms are always
    // unchanging references that never go stale

    return <div>My name is {name}</div>;
});

```

As such, you can access updates to multiple forms in a single `render()` component.

```js
function MyComponent(props) {
    const tableSize = useDendriform({
        height: 100,
        width: 200,
        depth: 300
    });

    return <div>
        {tableSize.render(tableSize => {
            const width = tableSize.branch('width').useValue();
            const depth = tableSize.branch('depth').useValue();
            return <div>
                table top area: {width * depth}
            </div>;
        })}
    </div>;
}
```

As the callback of `.render()` doesn't update in response to changes in the parent's props by default, you may sometimes need to force it to update using the last argument `dependencies`.

```js
function MyComponent(props) {
    const form = useDendriform({name: 'Ben'});
    const [className] = useState('darkMode');

    return <div>
        {form.render('name', form => {
            const [name, setName] = form.useValue();
            return <div className={className}>My name is {name}</div>;
        }, [className])}
    </div>;
}
```

[Demo](http://dendriform.xyz#renderdeps)

### Rendering arrays

The `.renderAll()` function works in the same way as `.render()`, but repeats for all elements in an array. React keying is taken care of for you.

See [Array operations](#array-operations) for convenient ways to let the user manipulate arrays of items.

```js
function MyComponent(props) {
    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {
            const colour = form.useValue();
            return <div>Colour: {colour}</div>;
        })}
    </div>;
}
```

Array element forms can also opt-in to updates regarding their indexes using the `.useIndex()` hook.

If you'll be allowing users to re-order items in an array, then please note that you'll get better performance if array element components don't know about their indexes. If the `.useIndex()` hook is used, a element that has moved its position inside of its parent array will need to update, even if it is otherwise unchanged.

The `.index` property is available for usages outside of React.

```js
function MyComponent(props) {
    const form = useDendriform({
        colours: ['Red', 'Green', 'Blue']
    });

    return <div>
        {form.renderAll('colours', form => {
            const colour = form.useValue();
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

Like with `.render()`, the `.renderAll()` function can also additionally accept an array of dependencies that will cause it to update in response to prop changes.

### Setting data

You can set data directly using `.set()`. This accepts the new value for the form. When called, changes will immediately be applied to the data in the form and any relevant `.useValue()` hooks and `.render()` methods will be scheduled to update by React.

```js
const form = new Dendriform('Foo');
form.set('Bar');
// form.value will update to become 'Bar'
```

The usage is the same in a React component

```js
function MyComponent(props) {
    const form = useDendriform('Foo');

    const name = form.useValue(); 

    const setToBar = useCallback(() => form.set('Bar'), []);

    return <div>
        Current name: {name}

        <button onClick={setToBar}>Set to Bar</button>
    </div>;
}
```

[Demo](http://dendriform.xyz#set)

When `.set()` is called on a deep form, the deep value will be updated immutably within its parent data shape. It uses structural sharing, so other parts of the data shape that haven't changed will not be affected.

```js
function MyComponent(props) {
    const form = useDendriform({name: 'Ben', age: 30});

    return <div>
        {form.render('name', form => {
            const name = form.useValue();
            const setToBill = useCallback(() => {
                form.set('Bill');
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

#### Buffering

To call it multiple times in a row, use `buffer()` to begin buffering changes and `done()` to apply the changes. These will affect the entire form including all branches, so `form.buffer()` has the same effect as `form.branch('example').buffer()`.

```js
const form = new Dendriform(0);
form.buffer();
form.set(draft => draft + 1);
form.set(draft => draft + 1);
form.set(draft => draft + 1);
form.done();
// form.value will update to become 3
```

### ES6 classes

ES6 classes can be stored in a form and its properties can be accessed using branch methods.

```js
class Person {
    firstName = '';
    lastName = '';
}

const person = new Person();
person.firstName = 'Billy';
person.lastName = 'Thump';

const form = new Dendriform(person);

// form.branch('firstName').value will be 'Billy'
```

But by default you will not be able to modify this value.

```js
const form = new Dendriform(person);
form.branch('firstName').set('Janet');
// ^ throws an error
```

To modify a class property, your class must have the `immerable` property on it [as immer's documentation describes](https://immerjs.github.io/immer/complex-objects).

You should import `immerable` from `dendriform` so you are guaranteed to get the immerable symbol from the version of immer that dendriform uses.

```js
import {immerable} from 'dendriform';

class Person {
    firstName = '';
    lastName = '';
    [immerable] = true; // makes the class immerable
}

const person = new Person();
person.firstName = 'Billy';
person.lastName = 'Thump';

const form = new Dendriform(person);
form.branch('firstName').set('Janet');
```

[Demo](http://dendriform.xyz#es6-classes)

### ES6 maps

ES6 maps can be stored in a form and its properties can be accessed using branch methods.

```js
const usersById = new Map();
usersById.set(123, 'Harry');
usersById.set(456, 'Larry');

const form = new Dendriform(usersById);

// form.branch(123).value will be 'Harry'
```

But by default you will not be able to modify this value.

```js
const form = new Dendriform(usersById);
form.branch(456).set('Janet');
// ^ throws an error
```

To modify a `Map`s value, support must be explicitly enabled by calling `enableMapSet()` [as immer's documentation describes](https://immerjs.github.io/immer/map-set).

```js
import {enableMapSet} from 'immer';

enableMapSet();

const usersById = new Map();
usersById.set(123, 'Harry');
usersById.set(456, 'Larry');

const form = new Dendriform(usersById);
form.branch(456).set('Janet');
```

[Demo](http://dendriform.xyz#es6-maps)

### Dates and other non-immerable data

[Immer](https://immerjs.github.io/immer) can't produce non-immerable data such as Dates. For Dendriform users this means that calling `form.branch('myDate').set(new Date())` likely throws the following error:

```
[Immer] produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'
```

To set a Date or other non-immerable value, set the value immutably from the parent like so:

```js
form.setParent(key => draft => {
    draft[key] = new Date();
})
```

This does impose the limitation that you cannot use Dendriform to edit _only_ a Date like `new Dendriform(new Date())`. However this use case would be rare, as Dendriform's main purpose is to make deep data structures easier to edit.

### Form inputs

You can easily bind parts of your data to form inputs using `useInput()` and `useCheckbox()`. The props they return can be spread onto form elements. A debounce value (milliseconds) can also be provided to `useInput()` to prevent too many updates happening in a short space of time.

Internally these function use React hooks, so also must follow React's rules of hooks.

```js
import {useDendriform, useInput, useCheckbox} from 'dendriform';

function MyComponent(props) {

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
            <label>comment: <textarea {...useInput(form)} /></label>
        ))}
    </div>;
};
```

[Demo](http://dendriform.xyz#inputs)

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

[Demo](http://dendriform.xyz#subscribe)

As these functions can be called on any form instance, including branched form instances, you can selectively and independently listen to changes in parts of a form's data shape.

```js
function MyComponent(props) {

    const form = useDendriform(() => ({
        firstName: 'Bill',
        lastName: 'Joe'
    }));

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

Alternatively you can use the `.useChange()` React hook.


```js
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
```

### Array operations

Common array operations can be performed using `array`.

```js
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
```

[Demo](http://dendriform.xyz#array)

### History

Dendriform can keep track of the history of changes and supports undo and redo. Activate this by specifying the maximum number of undos you would like to allow in the options object when creating a form.

History items consist of [immer patches](https://immerjs.github.io/immer/patches) that have been optimised, so they take up very little memory in comparison to full state snapshots.

```js
const form = new Dendriform({name: 'Bill'}, {history: 50});
// ...

function MyComponent(props) {
    const form = useDendriform({name: 'Ben'}, {history: 50});
    // ...
}
```

History can be navigated by calling `.undo()` and `.redo()` on any form. It does not matter if you are calling these on the top level form or any branched form, the effect will be the same.

```js
function MyComponent(props) {

    const form = useDendriform(() => ({name: 'Ben'}), {history: 100});

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            // this function will only re-render if canUndo or canRedo changes
            return <>
                <button onClick={form.undo} disabled={!canUndo}>Undo</button>
                <button onClick={form.redo} disabled={!canRedo}>Redo</button>
            </>;
        })}
    </div>;
}
```

[Demo](http://dendriform.xyz#history)

The `.go()` function can also be used to perform undo and redo operations.

```js
form.go(-1); // equivalent to form.undo()
form.go(1); // equivalent to form.redo()
form.go(-3); // equivalent to form.undo() called 3 times in a row
form.go(0); // does nothing
```

You can find if the form is able to undo or redo using `.history`, or by using the `.useHistory()` hook if you're inside a React component's render method. These both return an object `{canUndo: boolean, canRedo: boolean}`. This can be used to disable undo and redo buttons.

```js
function MyComponent(props) {

    const form = useDendriform(() => ({name: 'Ben'}), {history: 100});

    return <div>
        {form.render('name', form => (
            <label>name: <input {...useInput(form, 150)} /></label>
        ))}

        {form.render(form => {
            const {canUndo, canRedo} = form.useHistory();
            // this function will only re-render if canUndo or canRedo changes
            return <>
                <button onClick={form.undo} disable={!canUndo}>Undo</button>
                <button onClick={form.redo} disable={!canRedo}>Redo</button>
            </>;
        })}
    </div>;
};
```

You can also control how changes are grouped in the history stack.

The `.replace()` function can be used to prevent a new history item being created for the next `.set()`.

```js
const form = new Dendriform('a', {history: 50});

form.set('b');
// form will contain 'b' as a new history item
// if undo() is called, form will contain 'a' again

// ...after some time...

form.replace();
form.set('c');
// form will contain 'c' by updating the current history item
// if undo() is called, form will contain 'a' again
```

The `.replace()` function can also take a boolean for convenience.

```js
form.replace(true);
// equivalent to form.replace();

form.replace(false);
// equivalent to not calling form.replace() at all
```

Buffering multiple changes also works with `.replace()`.

```js
const form = new Dendriform(1, {history: 50});

form.set(2);
// form will contain 2 as a new history item
// if undo() is called, form will contain 1 again

// ...after some time...

form.replace();
form.buffer();
form.set(num => num + 1);
form.set(num => num + 1);
form.done();

// form will contain 4 by updating the current history item
// if undo() is called, form will contain 1 again
```

The `.buffer()` function can also be called again while buffering to add subsequent changes to a new history item. The changes still will not be applied until `.done()` is called.

```js
const form = new Dendriform('a', {history: 50});

// calling .set() multiple times in the same update
form.buffer();
form.set('b');
form.set('c');
form.done();

// form will contain 'c'
// if undo is called, form will contain 'a' again

// calling .set() multiple times in the same update
form.buffer();
form.set('b');
form.buffer();
form.set('c');
form.done();

// form will contain 'c'
// if undo is called, form will contain 'b'
// if undo is called a second time, form will contain 'a'
```

[Demo](http://dendriform.xyz#historygroup)

### Deriving data

When a change occurs, you can derive additional data in your form using `.onDerive`, or by using the `.useDerive()` hook if you're inside a React component's render method. Each derive function is called once immediately, and then once per change after that. When a change occurs, all derive callbacks are called in the order they were attached, after which `.onChange()`, `.useChange()` and `.useValue()` are updated with the final value.

The `.onDerive()` method returns an unsubscribe function you can call to stop deriving. The `.useDerive()` hook automatically unsubscribes when the component unmounts, so it returns nothing.

```js
const form = new Dendriform({
    a: 1,
    b: 2,
    sum: 0
});

const unsubscribe = form.onDerive(newValue => {
    form.branch('sum').set(newValue.a + newValue.b);
});

// now form.value is {a:1, b:2, sum:3}

// call unsubscribe() to unsubscribe
```

```js
function MyComponent(props) {
    const form = useDendriform({a: 1, b: 2, sum: 0});

    form.useDerive(newValue => {
        form.branch('sum').set(newValue.a + newValue.b);
    });

    // if form.branch('a').set(2); is called
    // the deriver function will be called
    // and form.value will contain {a:2, b:2, sum:4}
}
```

[Demo](http://dendriform.xyz#derive)

It is also possible and often preferrable to make changes in other forms in `.onDerive()`'s callback.

Here we can see that deriving data can be useful for implementing validation.

```js
const form = new Dendriform({name: 'Bill'});
const validState = new Dendriform({
    nameError: '',
    valid: true
});

form.onDerive(newValue => {
    const valid = newValue.name.trim().length > 0;
    const nameError = valid ? '' : 'Name must not be blank';
    validState.branch('valid').set(valid);
    validState.branch('nameError').set(nameError);
});
```

[Demo](http://dendriform.xyz#deriveother)

### Synchronising forms

You can use any number of forms to store your editable state so you can keep related data grouped logically together. However you might also want several separate forms to move through history together, so calling `.undo()` will undo the changes that have occurred in multiple forms. The `sync` utility can do this.

Synchronised forms must have the same maximum number of history items configured.

```js
import {sync} from 'dendriform';

const nameForm = new Dendriform({name: 'Bill'}, {history: 100});
const addressForm = new Dendriform({street: 'Cool St'}, {history: 100});

const unsync = sync(nameForm, addressForm);

// if nameForm.undo() is called, addressForm.undo() is also called, and vice versa
// if nameForm.redo() is called, addressForm.redo() is also called, and vice versa
// if nameForm.go() is called, addressForm.go() is also called, and vice versa

// call unsync() to unsynchronise the forms
```

[Demo](http://dendriform.xyz#sync)

Inside of a React component you can use the `useSync()` hook to achieve the same result.

```js
import {useSync} from 'dendriform';

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
```

The `sync()` function can also accept a deriver to derive data in one direction. This has the effect of caching each derived form state in history, and calling undo and redo will just restore the relevant derived data at that point in history.

```js
import {sync} from 'dendriform';

const namesForm = new Dendriform(['Bill', 'Ben', 'Bob'], {history: 100});

const addressForm = new Dendriform({
    street: 'Cool St',
    occupants: 0
}, {history: 100});

sync(nameForm, addressForm, names => {
    addressForm.branch('occupants').set(names.length);
});
```

[Demo](http://dendriform.xyz#syncderive)

## Drag and drop

Drag and drop can be implemented easily with libraries such as [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd), because dendriform takes care of the unique keying of array elements for you.

```js
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
```

[Demo](http://dendriform.xyz#draganddrop)

## Etymology

"Dendriform" means "tree shaped", referencing the tree-like manner in which you can traverse and render the parts of a deep data shape.

## Demos

Demos can be found on [dendriform.xyz](http://dendriform.xyz).

## Development

This library is written and maintained by [Damien Clarke](https://damienclarke.me/), with feedback from others at [92green](https://github.com/92green). All online library discussion happens over on [Github](https://github.com/92green/dendriform).

I hope this library helps solve some data-editing user interface problems for you. 🎉
