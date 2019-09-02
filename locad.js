const {
  preact: { h, Component, render },
  htm,
  mobx: { autorun, observable },
  mobxPreact: { observer }
} = self;

const html = htm.bind(h);

locad = observable({
  history: [],

  concepts: {},
  entries: {},

  apply(event) {
    if (!event.date) event.date = get_date();
    switch (event.type) {
      case "CONCEPT_ADDED": {
        const concept = {
          id: event.id,
          name: "",
          entry_ids: []
        };
        this.concepts[concept.id] = concept;
        break;
      }

      case "CONCEPT_RENAMED": {
        const concept = this.concepts[event.id];
        concept.name = event.name;
        break;
      }

      case "ENTRY_CREATED": {
        const entry = {
          id: event.id,
          fields: {}
        };
        this.entries[entry.id] = entry;
        this.concepts[event.concept_id].entry_ids.push(entry.id);
        break;
      }

      default:
        throw new Error("unknown event type");
    }
    this.history.push(event);
    console.log(event);
  },

  add_concept(id) {
    if (id in this.concepts) throw new Error("concept id already exists");
    this.apply({
      type: "CONCEPT_ADDED",
      id
    });
  },

  rename_concept(id, name) {
    if (!(id in this.concepts)) throw new Error("unknown concept id");
    this.apply({
      type: "CONCEPT_RENAMED",
      id,
      name
    });
  },

  create_entry(id, concept_id) {
    if (id in this.entries) throw new Error("entry id already exists");
    if (!(concept_id in this.concepts)) throw new Error("unknown concept id");
    this.apply({
      type: "ENTRY_CREATED",
      id,
      concept_id
    });
  }
});

function get_date() {
  return new Date().toISOString();
}

function new_uuid() {
  return Math.random()
    .toString(16)
    .slice(2);
}

function new_concept_id() {
  return "concept:" + new_uuid();
}

function new_entry_id() {
  return "entry:" + new_uuid();
}

const router = observable({ route: "#/concepts" });
autorun(() => (document.location.hash = router.route));
window.onhashchange = () => (router.route = document.location.hash);

const Concepts = observer(
  () => html`
    <div>
      <h1>Concepts</h1>
      <div class="grid">
        ${Object.values(locad.concepts).map(
          concept =>
            html`
              <a href="#/concepts/${concept.id}"
                ><button key=${concept.id}>
                  ${concept.name || "New concept"}<br /></button
              ></a>
            `
        )}
        <button
          key="add"
          class="add"
          onClick=${() => {
            const id = new_concept_id();
            locad.add_concept(id);
            router.route = "#/concepts/" + id;
          }}
        >
          Add concept
        </button>
      </div>
    </div>
  `
);

const Concept = observer(({ id }) => {
  const concept = locad.concepts[id];
  if (!concept) throw new Error("concept not found");
  function saveName(event) {
    const name = event.target.value;
    if (name !== locad.concepts[id].name) locad.rename_concept(id, name);
  }
  function blurOnEnter(event) {
    if (event.key === "Enter") event.target.blur();
  }
  const entries = concept.entry_ids.map(id => locad.entries[id]);
  const specimen = {};
  for (const entry of entries) Object.assign(specimen, entry.fields);
  const columns = Object.keys(specimen);
  return html`
    <div>
      <h1>
        <small>Concept</small>
        <input
          onblur=${saveName}
          onkeydown=${blurOnEnter}
          placeholder=${"New concept"}
          value=${concept.name}
        />
      </h1>
      <hr />
      ${concept.entry_ids.length > 0 &&
        html`
          <table>
            <thead>
              <tr>
                <th>Row</th>
                ${columns.map(
                  column =>
                    html`
                      <th>${column}</th>
                    `
                )}
                <th><button className="add small">New field</button></th>
              </tr>
            </thead>
            <tbody>
              ${concept.entry_ids.map(
                (entry, row) =>
                  html`
                    <tr>
                      <td>
                        ${row + 1}
                      </td>
                    </tr>
                  `
              )}
            </tbody>
          </table>
        `}
      <button
        class="add small"
        onclick=${() => {
          const id = new_entry_id();
          locad.create_entry(id, concept.id);
        }}
      >
        New entry
      </button>
    </div>
  `;
});

const App = observer(() => {
  const path = router.route.split("/");
  path.shift();
  let Component;
  const props = {};
  switch (path[0]) {
    case "concepts":
      if (path[1]) {
        Component = Concept;
        props.id = path[1];
      } else {
        Component = Concepts;
      }
      break;
  }
  return html`
    <${Component} ...${props} />
  `;
});

render(
  html`
    <${App} />
  `,
  document.getElementById("app")
);
