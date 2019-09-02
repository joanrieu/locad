const {
  preact: { h, Component, render },
  htm,
  mobx: { autorun, observable },
  mobxPreact: { observer }
} = self;

const html = htm.bind(h);

locad = observable({
  history: [],

  concepts: [],
  concepts_by_id: {},

  apply(event) {
    switch (event.type) {
      case "CONCEPT_ADDED": {
        const concept = {
          id: event.id,
          name: "",
          created_at: new Date(event.date),
          updated_at: new Date(event.date)
        };
        this.concepts.push(concept);
        this.concepts_by_id[concept.id] = concept;
      }
    }
    this.history.push(event);
  },

  add_concept(id) {
    if (id in this.concepts_by_id) throw new Error("concept id already exists");
    this.apply({
      type: "CONCEPT_ADDED",
      id,
      date: get_date()
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

const router = observable({ route: "#/concepts" });
autorun(() => (document.location.hash = router.route));
window.onhashchange = () => (router.route = document.location.hash);

const Concepts = observer(
  () => html`
    <div>
      <h1>Concepts</h1>
      <div class="grid">
        ${locad.concepts.map(
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

const Concept = observer(
  ({ id }) =>
    html`
      <div>
        <h1>
          <small>Concept</small> ${locad.concepts_by_id[id].name ||
            "New concept"}
        </h1>
      </div>
    `
);

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
    <div>
      <${Component} ...${props} />
      <pre><code>${locad.history
        .map(event => JSON.stringify(event))
        .join("\n")}</code></pre>
    </div>
  `;
});

render(
  html`
    <${App} />
  `,
  document.getElementById("app")
);
