```
// THINGS TO KEEP

- traverse your data like a tree
- ability to be controlled by higher up data sources / cope with shifting source data
- keeps original data in original shape, with attachable arbitrary metadata
- a syntax that doesnt require a new component per field
- autokeyed children
- debounce
- validation including async
- *optional* submit with failed request rollbacks
- undo / redo
- drag and drop
- derived fields
- provide modifiers somehow to translate data from one format to another

// NEW THINGS

- typescript support!
- better focus control!
- better integration with existing validation libs like yup
- able to output partial changes for proper concurrent editing?

// THINGS TO DITCH

- immutable parcels
  - Problem: they inherently force unnecesary ancestor rerenders
  - Solution: share an unchanging ref to the form instance instead, from there opt in to binding to React's reactions. Let entire layers of data not cause updates if the data at that level isnt actually used by the user for super performance (e.g. like mobx!)

- meta stored LITERALLY on each parcel:
  - Problem: leads to a difficult api for accessing these
  - Problem: inability to extend the idea to meta that doesnt belong to one single location path
  - Solution: meta as a Map() thats keyed on ids, very open and avaiable to all parcels in a tree

- only having hooks that provide state
  - Problem: your state must live in react. Sucks if you want to access anything outside React!
  - Problem: you get bound to executing things on React's terms, which may not be the best choice, just the most obvious one
  - Solution: dont put so much of the useful stuff inside hooks, just allow them to be used with hooks

- upward propagation of changes through a chain of all parcels
  - Problem: nothing ever knows enough and concurrency gets annoying as different parts of the tree know diferent things
  - Problem: treating changes as a stream and batching change sets through time is too laggy
  - Problem: all parcels require unique keys not only on keypath, but each usage of that keypath which is almost impossible without imposing strange restrictions
  - Solution: dont do it. only MAYBE do this for debouncing purposes
  - Solution: if people want a submittable region halfway down a chain, make it easy to chain a new form off the existing one

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

- inner platform sundrome
  - Problem: seems like parcels has too many array methods, but also doesnt have all of them :/
  - Solution: use immer, it does what the inside of dataparcels was trying to do, but way better

- the promise to be extensible enough to cope with any data type
  - Problem: becomes way more difficult to leverage other libraries that deal specifically with immutable state changes
  - Solution: dont make that promise, and defer the decision to someone else (e.g. immer)

- Generic package and a react package
  - Problem: the internal split surfaces as a slightly more complicated api, and im never really planning to work on or use a non-react version. cross that bridge if we need to later
  - Solution: single package

- providing a bunch of preset pathways for submit / onChange / update and forcing people to use them can be awkward
  - Solution: hooks exist, get the user to use them OUTSIDE the library to solve the issue

///////////

PROBLEM - how to uniquely key array elements!?

key from top like

form._keys = {
    'pets': ['#0','#1','#2'],
    'pets.#0.nicknames': ['#0']
}

///////////

EXAMPLE USAGES

props.response = {
    name: 'Geoff',
    pets: [
        {
            name: 'Woop',
            food: 'Pellets',
            nice: true
        }
    ]
};

const newPet = {
    name: '',
    food: '',
    nice: true
};

const initialMeta = {};

// let form = new Dendriform();
// form.key
// form.path

const Form = (props) => {

    let form = useDendriform({
        initialValue: props.response,
        initialMeta,
        onChange: (newValue, {newMeta, prevValue, prevMeta, produceValue}) => {},
        derive: draft => {},
        history: 50
    });

    let [value, produceValue] = form.useValue();
    // ^ heres the user opting into make this component react to changes in form value at this level

    let [meta, produceMeta] = form.useMeta();
    // ^ maybe also this?

    let doItAll = useCallback(() => {
        let produced = produceValue(123);

        produceMeta(draftMeta => {
            draftMeta.cool = true;
        });
    }, []);
    // ^ making multiple changes after each other like this is now totally fine as the handler isnt so bound to react as to always cause a separate update per change

    useEffect(() => void form.setBaseValue(props.response), [props.response]);
    // ^ syncing data from above? do it like this or something - api could change depending on the need for *access* of base data

    return <form onSubmit={form.onSubmit}>
        {form.branch('name', 200, field => <input {...field.useAttach()} />)}
        {form.branch('pets', [options], pets => <PetsEditor pets={pets} />)}

        <button type="submit">submit</button>
    </form>;
};

// stuff below here may be out of date

const PetsEditor = (props) => {
    let {pets} = props;

    return <div>
        {pets.branchAll(pet => <>
            <PetEditor key={pet.key} pet={pet} />
            <button onClick={remove(pet)}>Remove</button>
            <button onClick={move(pet, -1)}>^</button>
        </>)}
        <button onClick={push(pets, data => data.meta.newPet)}>Add</button>
    </div>;
};

const PetEditor = (props) => {
    let {pet} = props;
    let [nice, setNice] = pet.get('nice').state();

    return <div>
        {pet.branch('name', field => <input {...attach(field)} />)}
        {pet.branch('food', field => <input {...attach(field)} />)}

        <button onClick={setNice(nice => !nice)}>{nice ? 'nice' : 'not nice'}</button>
    </div>;
};
```
