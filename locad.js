const {
  preact: { h, Component, render },
  htm,
  mobx: { autorun, observable },
  mobxPreact: { observer }
} = self;

const html = htm.bind(h);

const locad = observable({
  history: [],

  concepts: {},
  fields: {},
  entries: {},

  apply(event) {
    if (!event.date) event.date = get_date();
    console.log(event);
    switch (event.type) {
      case "CONCEPT_CREATED": {
        const concept = {
          id: event.id,
          name: "",
          field_ids: [],
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

      case "FIELD_CREATED": {
        const field = {
          id: event.id,
          name: ""
        };
        locad.fields[field.id] = field;
        locad.concepts[event.concept_id].field_ids.push(field.id);
        break;
      }

      case "FIELD_RENAMED": {
        const field = this.fields[event.id];
        field.name = event.name;
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

      case "ENTRY_FIELD_UPDATED": {
        const entry = this.entries[event.entry_id];
        entry.fields[event.field_id] = event.value;
        break;
      }

      default:
        throw new Error("unknown event type");
    }
    this.history.push(event);
  },

  create_concept(id) {
    if (id in this.concepts) throw new Error("concept id already exists");
    this.apply({
      type: "CONCEPT_CREATED",
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

  create_field(id, concept_id) {
    if (id in this.fields) throw new Error("field id already exists");
    this.apply({
      type: "FIELD_CREATED",
      id,
      concept_id
    });
  },

  rename_field(id, name) {
    if (!(id in this.fields)) throw new Error("unknown field id");
    this.apply({
      type: "FIELD_RENAMED",
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
  },

  update_entry_field_value(entry_id, field_id, value) {
    if (!(entry_id in this.entries)) throw new Error("unknown entry id");
    if (!(field_id in this.fields)) throw new Error("unknown field id");
    this.apply({
      type: "ENTRY_FIELD_UPDATED",
      entry_id,
      field_id,
      value
    });
  }
});

for (const event of JSON.parse(localStorage.getItem("locad.history") || "[]"))
  locad.apply(event);

autorun(() =>
  localStorage.setItem("locad.history", JSON.stringify(locad.history))
);

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

function new_field_id() {
  return "field:" + new_uuid();
}

function new_entry_id() {
  return "entry:" + new_uuid();
}

function blur_when_enter_pressed(event) {
  if (event.key === "Enter") event.target.blur();
}

const router = observable({ route: document.location.hash || "#/concepts" });
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
              <a href="#/concepts/${concept.id}" key=${concept.id}
                ><button>${concept.name || "New concept"}<br /></button
              ></a>
            `
        )}
        <button
          class="add small"
          onClick=${() => {
            const id = new_concept_id();
            locad.create_concept(id);
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
  function save_name(name) {
    if (name !== concept.name) locad.rename_concept(id, name);
  }
  return html`
    <div>
      <h1>
        <small>Concept</small>
        <input
          onkeydown=${blur_when_enter_pressed}
          onblur=${event => save_name(event.target.value.trim())}
          placeholder=${"New concept"}
          value=${concept.name}
        />
      </h1>
      <${Fields} concept_id=${concept.id} />
      <${Entries} concept_id=${concept.id} />
    </div>
  `;
});

const Fields = observer(({ concept_id }) => {
  const concept = locad.concepts[concept_id];
  if (!concept) throw new Error("concept not found");
  const fields = concept.field_ids.map(id => locad.fields[id]);
  function save_name(id, name) {
    if (name !== locad.fields[id].name) locad.rename_field(id, name);
  }
  return html`
    <div>
      <h2>Fields</h2>
      ${fields.length > 0 &&
        html`
          <div class="horizontal-scroll">
            <table class="small">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                ${fields.map(
                  field =>
                    html`
                      <tr>
                        <td>
                          <input
                            key=${field.id}
                            onkeydown=${blur_when_enter_pressed}
                            onblur=${event =>
                              save_name(field.id, event.target.value.trim())}
                            placeholder="New field"
                            value=${field.name}
                          />
                        </td>
                      </tr>
                    `
                )}
              </tbody>
            </table>
          </div>
        `}
      <button
        className="add small"
        onclick=${() => {
          const id = new_field_id();
          locad.create_field(id, concept.id);
        }}
      >
        Add field
      </button>
    </div>
  `;
});

const Entries = observer(({ concept_id }) => {
  const concept = locad.concepts[concept_id];
  if (!concept) throw new Error("concept not found");
  const fields = concept.field_ids.map(id => locad.fields[id]);
  const entries = concept.entry_ids.map(id => locad.entries[id]);
  function save_entry_field_value(entry, field, value) {
    if (value !== entry.fields[field.id])
      locad.update_entry_field_value(entry.id, field.id, value);
  }
  return html`
    <div>
      <h2>Entries</h2>
      ${concept.entry_ids.length > 0 &&
        html`
          <div class="horizontal-scroll">
            <table class="small">
              <thead>
                <tr>
                  <th>Row</th>
                  ${fields.map(
                    field =>
                      html`
                        <th key=${field.id}>${field.name || "New field"}</th>
                      `
                  )}
                </tr>
              </thead>
              <tbody>
                ${entries.map(
                  (entry, row) =>
                    html`
                      <tr>
                        <td>
                          ${row + 1}
                        </td>
                        ${fields.map(
                          field =>
                            html`
                              <td key=${field.id}>
                                <input
                                  onkeydown=${blur_when_enter_pressed}
                                  onblur=${event =>
                                    save_entry_field_value(
                                      entry,
                                      field,
                                      event.target.value.trim()
                                    )}
                                  value=${entry.fields[field.id]}
                                />
                              </td>
                            `
                        )}
                      </tr>
                    `
                )}
              </tbody>
            </table>
          </div>
        `}
      <button
        class="add small"
        onclick=${() => {
          const id = new_entry_id();
          locad.create_entry(id, concept.id);
        }}
      >
        Add entry
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
