const {
  preact: { h, Component, render },
  htm,
  mobx: { observable },
  mobxPreact: { observer }
} = self;

const html = htm.bind(h);

const locad = observable({
  history: [],

  concepts: [],

  apply(event) {
    switch (event.type) {
      case "CONCEPT_ADDED": {
        this.concepts.push({
          id: event.id,
          name: "New concept"
        });
      }
    }
    this.history.push(event);
  },

  add_concept() {
    this.apply({
      type: "CONCEPT_ADDED",
      id:
        "concept:" +
        Math.random()
          .toString(16)
          .slice(2)
    });
  }
});

const App = observer(
  () => html`
    <div>
      ${locad.concepts.map(
        concept =>
          html`
            <button key=${concept.id}>${concept.name}</button>
          `
      )}
      <button key="add" class="add" onClick=${() => locad.add_concept()}>
        Add concept
      </button>
      <pre><code>${locad.history
        .map(event => JSON.stringify(event))
        .join("\n")}</code></pre>
    </div>
  `
);

render(
  html`
    <${App} />
  `,
  document.getElementById("app")
);
