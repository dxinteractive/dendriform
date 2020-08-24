// THINGS TO KEEP

- traverse your data like a tree 
- a syntax that doesnt require a new component per field
- keeps original data in original shape
- autokeyed children
- debounce
- validation including async
- *optional* submit
- undo / redo
- ability to be controlled by higher up data sources / cope with shifting source data
- provide modifiers somehow to translate data from one format to another
- drag and drop items
- selectable items
- derived fields

// NEW THINGS

- better focus control!
- better integration with validation libs like yup
- able to output partial changes for proper concurrent editing?

// THINGS TO DITCH

- immutable parcels
  - Problem: they inherently force unnecesary ancestor rerenders)
  - Solution: share an unchanging ref to the form instance instead

- meta stored LITERALLY on each parcel:
  - Problem: leads to a difficult api for accessing these
  - Problem: inability to extend the idea to meta that doesnt belong to one single location path
  - Solution: meta as a Map() thats keyed on ids

- hooks that provide state
  - Problem: your state must live in react. Sucks if you want to access anything outside React!
  - Solution: dont put so much of the useful stuff inside hooks, just allow them to be used with hooks

- upward propagation of changes through a chain of all parcels
  - Problem: nothing ever knows enough and concurrency gets annoying
  - Solution: only do this for debouncing purposes
  - Solution: if people want a submittable region halfway down a chain, make it easy to chain a new form off the existing one

- halfway-down-the-chain modifiers:
  - Problem: soo much internal juggling and esoteric usage patterns
  - Problem: knowledge of these modifiers isnt known up at the top where its needed half the time
  - Solution: config these at the top??? what if two inputs want different modifiers?

- changing data via un-codesplittable methods
  - Problem: methods on a class arent code-splittable
  - Solution: use immer
  - Solution: make people import fancy methods for changing

- roll-your-own history system
  - Problem: lots of code to maintain and tests to write
  - Solution: use immer

- the promise to be extensible enough to cope with any data type
  - Problem: becomes way more difficult to leverage other libraries that deal specifically with immutable state changes
  - Solution: dont make that promise, and defer the decision to someone else (e.g. immer)

- Generic package and a react package
  - Problem: the internal split surfaces as a slightly more complicated api, and im never really planning to work on or use a non-react version. cross that bridge if we need to later
  - Solution: single package

///////////

PROBLEM

how to uniquely key array elements!?

///////////

const initialValue = {
    name: 'Geoff',
    pets: [
        {
            name: 'Woop',
            food: 'Pellets',
            nice: true
        }
    ]
};

// could this be better?
const newPet = {
    name: '',
    food: '',
    nice: true
};

const initialMeta = {
    newPet
};

let form = new Dendriform();
// form.key
// form.path
// form.meta
// form.value

/*
form._keys = {
    'pets': ['#0','#1','#2'],
    'pets.#0.nicknames': ['#0']
}
*/

// form.set(123)
// form.set(draft => {
//     draft.reverse()   
// })

const Form = (props) => {

    // let form = useDendriform({
    //     initialValue,
    //     initialMeta,
    //     onChange: (newValue, {prevValue, set, setBase}) => ...
    //     derive: draft => {},
    //     history: 50
    // });

    // useEffect(() => void form.setBase(foo), [foo]);

    return <form onSubmit={form.onSubmit}>
        {form.branch('name', 200, field => <input {...attach(field)} />)}
        {form.branch('pets', [options], pets => <PetsEditor pets={pets} />)}

        <button type="submit">submit</button>
    </form>;
};

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

