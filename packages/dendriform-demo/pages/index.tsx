
// style

import styled from 'styled-components';
import {space, color, layout, flexbox, position, border, compose, textStyle} from 'styled-system';
import {useRouter} from 'next/router';

const styledProps = compose(
    border,
    color,
    flexbox,
    layout,
    position,
    space,
    textStyle
);

export const Span = styled.span({}, styledProps);

export const Box = styled.div({display: 'block'}, styledProps);

export const Flex = styled.div({display: 'flex'}, styledProps);

export const Fixed = styled.div({position: 'fixed'}, styledProps);

export const Absolute = styled.div({position: 'absolute'}, styledProps);

//
// usage
//

import {useEffect, useState, useCallback} from 'react';
import {useDendriform, useInput, useCheckbox, array} from 'dendriform';
import {immerable} from 'immer';

class MyValue {

    [immerable] = true;

    constructor(data: unknown) {
        this.text = data.text;
        this.checkbox = data.checkbox;
        this.fruit = data.fruit;
        this.bar = data.bar;
        this.pets = data.pets;
    }

    text: string;
    checkbox: boolean;
    fruit: string|undefined;
    bar: {
        baz: number;
    };
    pets: Array<{name: string}>;

    stringy(): string {
        return `${this.text} ... ${this.fruit}`;
    }
}

export default function Main(): React.ReactElement {

    const router = useRouter();

    const form = useDendriform<MyValue>(() => {
        return new MyValue({
            text: 'ad',
            checkbox: true,
            fruit: undefined,
            bar: {
                baz: 12
            },
            pets: [
                {name: 'oh no'},
                {name: 'oh no!'},
                {name: 'oh noo!'}
            ]
        });
    });

    form.useChange((value, details) => {
        // eslint-disable-next-line no-console
        console.log('value, details', value, details);
        // TODO - this messes up history
        //router.push(`?text=${thing.text}`)
    });

    const {text} = router.query;
    useEffect(() => {
        if(text) {
            form.branch('text').set(text);
        }
    }, [text]);

    // tick for testing pure rendering
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(a => a + 2), 5000);
        return () => clearInterval(interval);
    }, []);

    return <Layout>
        <RenderRegion>
            <Box p={2}>
                Top level... notice how it doesnt rerender because it didnt use .useValue() and therefore didnt opt in to receiving value updates, even though the useDendriform() hook holding the state lives in this component. This is going to be a **huge** perf boost
            </Box>
            <Box p={2}>
                Tick: {tick} seconds
            </Box>
            {form.render(form => {
                return <Box p={2}>
                    <button onClick={() => form.undo()}>Undo</button>
                    <button onClick={() => form.redo()}>Redo</button>
                </Box>;
            })}
            <Box p={2}>
                <strong>Text inputs with debounce</strong><br/>
            </Box>
            <Box p={2}>
                {form.render('text', form => {
                    return <RenderRegion p={2}>
                        <input {...useInput(form, 150)} />
                    </RenderRegion>;
                })}
            </Box>
            <Box p={2}>
                {form.render('text', form => {
                    return <RenderRegion p={2}>
                        <input {...useInput(form, 150)} /> and tick dependency: {tick} seconds
                    </RenderRegion>;
                }, [tick])}
            </Box>



            <Box p={2}>
                <strong>Checkbox field</strong>
            </Box>
            <Box p={2}>
                {form.render('checkbox', form => {
                    return <RenderRegion p={2}>
                        <input type="checkbox" {...useCheckbox(form)} />
                    </RenderRegion>;
                })}
            </Box>



            <Box p={2}>
                <strong>Select field</strong>
            </Box>
            <Box p={2}>
                {form.render('fruit', form => {
                    return <RenderRegion p={2}>
                        <select {...useInput(form)}>
                            <option value="grapefruit">Grapefruit</option>
                            <option value="lime">Lime</option>
                            <option value="coconut">Coconut</option>
                            <option value="mango">Mango</option>
                        </select>
                    </RenderRegion>;
                })}
            </Box>


            <Box p={2}>
                <strong>Array of fields</strong>
            </Box>
            <Box p={2}>
                {/*form.renderAll('pets', form => {
                    //const [pets, setPets] = form.useValue();

                    return <RenderRegion p={2}>
                        {form.render('name', form => {
                            return <RenderRegion p={2}>
                                <input {...useInput(form, 150)} />
                            </RenderRegion>;
                        })}
                    </RenderRegion>;
                })*/}

                {form.render('pets', form => {
                    return <RenderRegion p={2}>
                        {form.renderAll(form => {
                            //const [pets, setPets] = pet.useValue();

                            return <RenderRegion p={2}>
                                {form.render('name', name => {
                                    return <RenderRegion p={2}>
                                        <input {...useInput(name, 150)} />
                                        {`${name.value}`}
                                    </RenderRegion>;
                                })}
                                {`${form.value.name}`}
                                <p>
                                    <span onClick={() => form.set(array.remove())}>X </span>
                                    <span onClick={() => form.setParent(index => array.move(index, index + 1))}>V </span>
                                    <span onClick={() => form.setParent(index => array.move(index, index - 1))}>^ </span>
                                </p>
                            </RenderRegion>;
                        })}
                    </RenderRegion>;
                })}

                <p onClick={() => form.branch('pets').set(array.unshift({name: 'new pet'}))}>unshift()</p>
                <p onClick={() => form.branch('pets').set(array.shift())}>shift()</p>
                <p onClick={() => form.branch('pets').set(array.push({name: 'new pet'}))}>push()</p>
                <p onClick={() => form.branch('pets').set(array.pop())}>pop()</p>
                <p onClick={() => form.branch('pets').set(array.move(1,2))}>swap 1 and 2()</p>
            </Box>



            <Box p={2}>
                <strong>Deep field calling set() directly</strong>
            </Box>
            <Box p={2}>
                {form.render(['bar','baz'], form => {
                    const [baz, setBaz] = form.useValue();

                    const upSet = useCallback(() => {
                        setBaz(baz + 3);
                    }, [baz]);

                    return <RenderRegion p={2}>
                        <p onClick={upSet}>Click to +3 - {baz}</p>
                    </RenderRegion>;
                })}
            </Box>



            <Box p={2}>
                <strong>Calling set() multiple times in a row</strong>
            </Box>
            <Box p={2}>
                {form.render('bar', form => {
                    const [bar, setBar] = form.useValue();

                    const up = useCallback(() => {
                        setBar(draft => {
                            draft.baz++;
                        });
                        setBar(draft => {
                            draft.baz++;
                        });
                        setBar(draft => {
                            draft.baz++;
                        });
                    }, []);

                    return <RenderRegion p={2}>
                        <p onClick={up}>Click to +3 - {bar.baz}</p>
                    </RenderRegion>;
                })}
            </Box>
        </RenderRegion>
    </Layout>;
}















const TEXT = `
- traverse your data like a tree ✅
- traverse your data like a tree including arrays ✅
- keeps original data in original shape ✅
- a syntax that doesnt require a new component per field (even if it does this under the hood) ✅
- full typescript support! ✅
- api that allows components to "opt in" to React updates for way better perf ✅
- non "inner platform" syntax for editing deep objects (immer) ✅
- helpers for binding to inputs ✅
- debounce changes ✅
- getIn() ✅
- batch changes ✅
- memoized branch creation ✅
- can instanciate forms outside of react ✅
- autokeyed children / rearrange arrays with immer and keep meta associated ✅
- opt-in es6 class compatibility ✅
- onChange ✅
- ability to be controlled by higher up data sources ✅
- undo / redo ✅
- allow multiple sets in a row to be squashed together ✅
- array element mutations ✅
- able to output JSON patches for proper concurrent editing ✅
- full error messages only on prod ✅

// SOON

- derived data computation
- validation
  - need to make it possible to prefill errors from back end response
- opt-in submit with failed request rollbacks

// LATER
- drag and drop array elements
- provide modifiers somehow to translate data from one format to another
- plugins and sub-forms to take the place of meta data
- ability to rebase actions onto new source data
- better focus control
- better integration with existing validation libs like yup
- chain a small form off a big one for submittable sub-forms
- opt-in es6 Map and Set compatibility















// THINGS TO DITCH - DATAPARCELS POST-MORTEM

- immutable parcels
  - Problem: they inherently force unnecesary ancestor rerenders
  - Problem: React's whole "pass things down as props and let children decide when to update"
             is a bit flawed, as child components are forced to have a bunch of non-declaritive
             and difficult to test code to determine if they shouldComponentUpdate(). Its duplicative,
             must be kept in sync with the data access, and nobody can be bothered.
             They should just let child components opt in to the type of updates they're interested in
             and know if it should update based on that usage. Which is exactly what mobx does.
             (e.g. I want "this component only cares about meta.error! ONLY UPDATE IF THAT BIT CHANGES")
  - Solution: share an unchanging ref to the form instance instead, from there opt in
              to binding to React's reactions. Let entire layers of data not cause updates
              if the data at that level isnt actually used by the user for super performance
              (e.g. like mobx!)
  - Solution: provide a hook for each type of data to access (value. vs each type of meta), so usage
              is fine grained enough that re-renders can be reduced heaps WITHOUT touching
               shouldComponentUpdate() and duplicating the "I want to use this" type code that
               shouldComponentUpdate() or React.memo() normally wants you to write

- meta stored LITERALLY on each parcel:
  - Problem: leads to a difficult api for accessing these
  - Problem: inability to extend the idea to meta that doesnt belong to one single location path
  - Solution: meta as a Map() thats keyed on ids, very open and avaiable to all parcels in a tree

- only having hooks that provide state
  - Problem: your state must live in react. Sucks if you want to access anything outside React!
  - Problem: you get bound to executing things on React's terms,
             which may not be the best choice, just the most obvious one
  - Solution: dont put so much of the useful stuff inside hooks, just allow them to be used with hooks

- upward propagation of changes through a chain of all parcels
  - Problem: nothing ever knows enough and concurrency gets annoying as different parts of the tree
             know different things
  - Problem: treating changes as a stream and batching change sets through time is too laggy
  - Problem: all parcels require unique keys not only on keypath, but each usage of that keypath which
             is almost impossible without imposing strange restrictions
  - Solution: dont do it. only MAYBE do this for debouncing purposes
  - Solution: if people want a submittable region halfway down a chain, make it easy to chain a new
              form off the existing one

- halfway-down-the-chain modifiers:
  - Problem: soo much internal juggling and esoteric usage patterns came about because of this one small idea
  - Problem: knowledge of these modifiers isnt known up at the top where its needed half the time
  - Solution: config these at the top??? what if two inputs want different modifiers? Needs more thought

- changing data via un-codesplittable methods
  - Problem: methods on a class arent code-splittable
  - Solution: use immer, it does what the inside of dataparcels was trying to do, but way better
  - Solution: make people import fancy methods for changing

- roll-your-own history system
  - Problem: lots of code to maintain and tests to write
  - Solution: use immer, it does what the inside of dataparcels was trying to do, but way better

- inner platform syndrome
  - Problem: seems like parcels has too many array methods, but also doesnt have all of them :/
  - Solution: use immer, it does what the inside of dataparcels was trying to do, but way better

- the promise to be extensible enough to cope with any data type
  - Problem: becomes way more difficult to leverage other libraries that deal specifically with immutable state changes
  - Solution: dont make that promise, and defer the decision to someone else (e.g. immer)

- Generic package and a react package
  - Problem: the internal split surfaces as a slightly more complicated api, and im never really planning to work on
             or use a non-react version. cross that bridge if we need to later
  - Solution: single package, way more succint API!

- providing a bunch of preset pathways for submit / onChange / update and forcing people to use them can be awkward
  - Solution: hooks exist, get the user to use them OUTSIDE the library to solve the issue
`;










// boring layout, skip this one

interface LayoutProps {
    children: React.ReactNode[]|React.ReactNode
}

const Layout = (props: LayoutProps): React.ReactElement => {
    return <Box p={3}>
        <h1>dendriform demo</h1>
        <Box mt={3} mb={6}>{props.children}</Box>
        <pre>{TEXT}</pre>
    </Box>;
};

interface RenderRegionProps {
    children: React.ReactNode[]|React.ReactNode;
    p?: number;
}

const RenderRegion = (props: RenderRegionProps): React.ReactElement => {
    const num = () => Math.floor(Math.random() * 100) + 156;
    const backgroundColor = `rgb(${num()},${num()},${num()})`;
    return <Box style={{backgroundColor}} {...props} />;
};
