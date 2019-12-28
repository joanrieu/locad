<table>
    <thead>
        <tr>
            <th><span>#</span></th>
            {#each fields as field}
            <th>
                <input
                    type="text"
                    bind:value="{field.name}"
                    placeholder="&hellip;"
                />
            </th>
            {/each}
            <th><button on:click="{addField}">+</button></th>
        </tr>
    </thead>
    <tbody>
        {#each items as item, i}
        <tr>
            <td><span>{i+1}</span></td>
            {#each fields as field}
            <td>
                <input
                    type="text"
                    bind:value="{item[field.id]}"
                    placeholder="&hellip;"
                />
            </td>
            {/each}
        </tr>
        {/each}
        <tr>
            <td colspan="{fields.length+1}" style="text-align: center;">
                <button on:click="{addItem}">+</button>
            </td>
        </tr>
    </tbody>
</table>

<script>
    let fields = [
        // { id: "name", name: "Name" }
        // { id: "description", name: "Description" }
    ];
    let items = [
        // {
        //     name: "hello",
        //     description: "world"
        // },
        // {
        //     name: "foo",
        //     description: "bar"
        // },
        // {
        //     name: "toto",
        //     description: "tata"
        // }
    ];

    function addField() {
        fields = [
            ...fields,
            {
                id:
                    "field:" +
                    Math.random()
                        .toString(16)
                        .slice(2),
                name: ""
            }
        ];
    }

    function addItem() {
        items = [...items, { name: "" }];
    }
</script>

<style>
    table {
        border-spacing: 0;
    }

    th {
        border-bottom: 1px solid lightgrey;
    }

    tr:first-child td {
        padding-top: 0.5em;
    }

    span {
        color: lightgrey;
    }

    span,
    input {
        font: inherit;
        border: none;
        margin: 0.1em 0.2em;
        padding: 0.4em 0.8em;
        display: block;
    }

    button {
        padding: 0.2em 0.8em;
    }
</style>
