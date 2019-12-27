const {
  preact: { h, Component, render },
  htm,
  mobx: { autorun, observable, runInAction },
  mobxPreact: { observer }
} = self;

const html = htm.bind(h);

const locad = observable({
  history: [],
  undo_stack: [],
  redo_stack: [],

  concepts: {},
  fields: {},
  concept_field_links: {},
  entries: {},
  entry_field_values: {},

  apply(event) {
    runInAction(event.type, () => {
      const { concepts, fields, entries } = this;
      const self = { concepts, fields, entries };
      this.undo_stack.push(JSON.stringify(self));
      const redo_stack_backup = this.redo_stack;
      this.redo_stack = [];

      if (!event.date) event.date = get_date();
      console.log(event);

      switch (event.type) {
        case "CONCEPT_CREATED": {
          const concept = {
            id: event.id,
            name: ""
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
          const { id, concept_id } = event;
          const field = {
            id,
            name: ""
          };
          locad.fields[field.id] = field;
          const concept_field_link_id = [concept_id, field.id].join();
          const entry_ids = get_entry_ids_of_concept(concept_id);
          this.concept_field_links[concept_field_link_id] = {
            id: concept_field_link_id,
            concept_id,
            field_id: id
          };
          for (const entry_id of entry_ids) {
            const entry_field_value_id = get_entry_field_value_id(entry_id, id);
            if (!(entry_field_value_id in this.entry_field_values))
              this.entry_field_values[entry_field_value_id] = null;
          }
          break;
        }

        case "FIELD_RENAMED": {
          const field = this.fields[event.id];
          field.name = event.name;
          break;
        }

        case "FIELD_DELETED": {
          delete this.fields[field.id];
          break;
        }

        case "ENTRY_CREATED": {
          const { id, field_ids } = event;
          const entry = { id };
          this.entries[entry.id] = entry;
          for (const field_id of field_ids)
            this.entry_field_values[
              get_entry_field_value_id(id, field_id)
            ] = null;
          break;
        }

        case "ENTRY_FIELD_VALUE_UPDATED": {
          const { entry_id, field_id } = event;
          const id = get_entry_field_value_id(entry_id, field_id);
          this.entry_field_values[id] = event.value;
          break;
        }

        case "ENTRY_DELETED": {
          const entry = this.entries[event.id];
          delete this.entries[entry.id];
          break;
        }

        case "UNDO": {
          const current = this.undo_stack.pop();
          const previous = this.undo_stack.pop();
          this.redo_stack = redo_stack_backup;
          this.redo_stack.push(current);
          Object.assign(this, JSON.parse(previous));
          break;
        }

        case "REDO": {
          this.redo_stack = redo_stack_backup;
          const next = this.redo_stack.pop();
          Object.assign(this, JSON.parse(next));
          break;
        }

        default:
          throw new Error("unknown event type");
      }

      this.history.push(event);
    });
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
    if (!(concept_id in this.concepts)) throw new Error("unknown concept id");
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

  delete_field(id) {
    if (!(id in this.fields)) throw new Error("unknown field id");
    this.apply({
      type: "FIELD_DELETED",
      id
    });
  },

  create_entry(id, field_ids) {
    if (id in this.entries) throw new Error("entry id already exists");
    for (const field_id of field_ids)
      if (!(field_id in this.fields)) throw new Error("unknown field id");
    this.apply({
      type: "ENTRY_CREATED",
      id,
      field_ids
    });
  },

  update_entry_field_value(entry_id, field_id, value) {
    if (!(entry_id in this.entries)) throw new Error("unknown entry id");
    if (!(field_id in this.fields)) throw new Error("unknown field id");
    this.apply({
      type: "ENTRY_FIELD_VALUE_UPDATED",
      entry_id,
      field_id,
      value
    });
  },

  delete_entry(id) {
    if (!(id in this.entries)) throw new Error("unknown entry id");
    this.apply({
      type: "ENTRY_DELETED",
      id
    });
  },

  can_undo() {
    return this.undo_stack.length > 0;
  },

  undo() {
    if (!this.can_undo()) throw new Error("nothing to undo");
    this.apply({
      type: "UNDO"
    });
  },

  can_redo() {
    return this.redo_stack.length > 0;
  },

  redo() {
    if (!this.can_redo()) throw new Error("nothing to redo");
    this.apply({
      type: "REDO"
    });
  }
});

const HISTORY_KEY = "locad.history";

runInAction(HISTORY_KEY, () => {
  for (const event of JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"))
    locad.apply(event);
});

autorun(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(locad.history)));

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

function get_entry_field_value_id(entry_id, field_id) {
  return [entry_id, field_id].join();
}

function get_field_ids_of_concept(concept_id) {
  return Object.values(locad.concept_field_links)
    .filter(link => link.concept_id === concept_id)
    .map(link => link.field_id);
}

function get_entry_ids_with_fields(field_ids) {
  return Object.keys(locad.entries).filter(
    entry_id =>
      !field_ids.find(
        field_id =>
          !(
            get_entry_field_value_id(entry_id, field_id) in
            locad.entry_field_values
          )
      )
  );
}

function get_entry_ids_of_concept(concept_id) {
  return get_entry_ids_with_fields(get_field_ids_of_concept(concept_id));
}

function save_or_cancel(event, original) {
  if (event.key === "Enter") event.target.blur();
  else if (event.key === "Escape") {
    event.target.value = original;
    event.target.blur();
  }
}

const router = observable({ route: document.location.hash || "#/concepts" });
autorun(() => (document.location.hash = router.route));
window.onhashchange = () => (router.route = document.location.hash);

const Logo = () =>
  html`
    <em class="logo">Locad</em>
  `;

const Concepts = observer(
  () => html`
    <div>
      <nav class="small">
        <${Logo} />
      </nav>
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
  if (!concept) return null;
  function save_name(name) {
    if (name !== concept.name) locad.rename_concept(id, name);
  }
  return html`
    <div>
      <nav class="small">
        <div>
          <a href="#/concepts"><button>All concepts</button></a>
        </div>
        <${Logo} />
        <div>
          ${locad.can_undo() &&
            html`
              <button key="undo" onclick=${() => locad.undo()}>
                Undo
              </button>
            `}
          ${locad.can_redo() &&
            html`
              <button key="redo" onclick=${() => locad.redo()}>
                Redo
              </button>
            `}
        </div>
      </nav>
      <h1>
        <label>
          <small>Concept</small>
          <input
            onkeydown=${event => save_or_cancel(event, concept.name)}
            onblur=${event => save_name(event.target.value.trim())}
            placeholder=${"New concept"}
            value=${concept.name}
          />
        </label>
      </h1>
      <${Fields} concept_id=${concept.id} />
      <${Entries} concept_id=${concept.id} />
    </div>
  `;
});

const Fields = observer(({ concept_id }) => {
  const fields = Object.values(locad.concept_field_links)
    .filter(link => link.concept_id === concept_id)
    .map(link => locad.fields[link.field_id]);
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
                            onkeydown=${event =>
                              save_or_cancel(event, field.name)}
                            onblur=${event =>
                              save_name(field.id, event.target.value.trim())}
                            placeholder="New field"
                            value=${field.name}
                          />
                        </td>
                        <td class="action">
                          <button onclick=${() => locad.delete_field(field.id)}>
                            🗑️
                          </button>
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
          const field_id = new_field_id();
          locad.create_field(field_id, concept_id);
        }}
      >
        Add field
      </button>
    </div>
  `;
});

const view = observable({
  type: "table",
  focus: null
});

const Entries = observer(({ concept_id }) => {
  const field_ids = get_field_ids_of_concept(concept_id);
  const entry_ids = get_entry_ids_with_fields(field_ids);
  return html`
    <div>
      <h2>Entries</h2>
      ${entry_ids.length > 0 &&
        html`
          <div class="horizontal-scroll">
            <div class="small">
              <fieldset>
                <span>
                  Visualization:
                </span>
                <input
                  type="radio"
                  name="view.type"
                  id="view.type.table"
                  checked=${view.type === "table"}
                  onchange=${() => (view.type = "table")}
                />
                <label for="view.type.table">
                  Table
                </label>
                <input
                  type="radio"
                  name="view.type"
                  id="view.type.card"
                  checked=${view.type === "card"}
                  onchange=${() => (view.type = "card")}
                />
                <label for="view.type.card">
                  Card
                </label>
              </fieldset>
            </div>
            ${view.type === "table" &&
              html`
                <${EntriesTable}
                  entry_ids=${entry_ids}
                  field_ids=${field_ids}
                />
              `}
            ${view.type === "card" &&
              html`
                <${EntriesCards}
                  entry_ids=${entry_ids}
                  field_ids=${field_ids}
                />
              `}
          </div>
        `}
      <button
        class="add small"
        onclick=${() => {
          const entry_id = new_entry_id();
          locad.create_entry(entry_id, field_ids);
        }}
      >
        Add entry
      </button>
    </div>
  `;
});

const EntriesTable = observer(
  ({ entry_ids, field_ids }) => html`
    <table class="small">
      <thead>
        <tr>
          <th>Row</th>
          ${field_ids
            .map(id => locad.fields[id])
            .map(
              field =>
                html`
                  <th key=${field.id}>${field.name || "New field"}</th>
                `
            )}
        </tr>
      </thead>
      <tbody>
        ${entry_ids.map(
          (entry_id, row) =>
            html`
              <tr key=${entry_id}>
                <td>
                  ${row + 1}
                </td>
                ${field_ids.map(
                  field_id =>
                    html`
                      <td key=${field_id}>
                        <${EntryFieldValueInput}
                          entry_id=${entry_id}
                          field_id=${field_id}
                        />
                      </td>
                    `
                )}
                <td class="action">
                  <button onclick=${() => locad.delete_entry(entry_id)}>
                    🗑️
                  </button>
                </td>
              </tr>
            `
        )}
      </tbody>
    </table>
  `
);

const EntriesCards = observer(
  ({ entry_ids, field_ids }) => html`
    <div class="grid">
      ${entry_ids.map(
        entry_id =>
          html`
            <div key=${entry_id} class="card">
              ${field_ids
                .map(id => locad.fields[id])
                .map(
                  field =>
                    html`
                      <label
                        ><small>
                          ${field.name}
                        </small>
                        <${EntryFieldValueInput}
                          entry_id=${entry_id}
                          field_id=${field.id}
                        />
                      </label>
                    `
                )}
            </div>
          `
      )}
    </div>
  `
);

const EntryFieldValueInput = observer(({ entry_id, field_id }) => {
  const entry = locad.entries[entry_id];
  const field = locad.fields[field_id];
  if (!entry || !field) return null;
  const entry_field_value_id = get_entry_field_value_id(entry_id, field_id);
  function focus_entry_field() {
    view.focus = entry_field_value_id;
  }
  function format_entry_field_value() {
    const value = locad.entry_field_values[entry_field_value_id];
    if (value == null) return;
    const isFocused = entry_field_value_id === view.focus;
    if (isFocused) return value;
    const currency = (value.match(/^([A-Z]{3})\s*/) ||
      value.match(/\s*([A-Z]{3})$/) ||
      [])[1];
    if (currency) {
      const amount_text = value.replace(currency, "").trim();
      const amount = parseFloat(amount_text);
      if (isFinite(amount) && amount.toString() === amount_text)
        return amount.toLocaleString(undefined, {
          style: "currency",
          currency
        });
    }
    if (value.endsWith("%")) {
      const percent_text = value.replace(/%$/, "").trim();
      const percent = parseFloat(percent_text);
      if (isFinite(percent) && percent.toString() === percent_text)
        return (percent / 100).toLocaleString(undefined, {
          style: "percent"
        });
    }
    if (value.startsWith("=")) {
      const expr = value.slice(1);
      if (expr.match(/^(\d|\.|\(|\)|\+|-|\*|\/|\s)+$/)) {
        try {
          return eval(expr).toLocaleString();
        } catch (error) {
          return "#ERROR";
        }
      }
    }
    const number = parseFloat(value);
    if (isFinite(number) && number.toString() === value)
      return number.toLocaleString();
    return value;
  }
  function save_entry_field_value(value) {
    if (value !== locad.entry_field_values[entry_field_value_id])
      locad.update_entry_field_value(entry.id, field.id, value);
    view.focus = null;
  }
  return html`
    <input
      onkeydown=${event => save_or_cancel(event, format_entry_field_value())}
      onfocus=${focus_entry_field}
      onblur=${event => save_entry_field_value(event.target.value.trim())}
      value=${format_entry_field_value()}
    />
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
