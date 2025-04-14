import { app } from "../../scripts/app.js";

const NODE_NAME = 'Example'


function textarea({ node, inputName, inputData, app }) {
    const defaultVal = inputData[1].default || "";
    const {
        placeholder
    } = inputData[1]

    const inputEl = document.createElement("div");
    inputEl.className = "comfy-multiline-input";
    inputEl.value = defaultVal;
    inputEl.placeholder = placeholder || inputName;

    const widget = node.addDOMWidget(inputName, "customtext", inputEl, {
        getValue() {
            return inputEl.value;
        },
        setValue(v) {
            inputEl.value = v;
        },
    });
    widget.inputEl = inputEl;

    inputEl.addEventListener("input", () => {
        widget.callback?.(widget.value);
    });

    return { minWidth: 400, minHeight: 200, widget };
}

// Register a new node type
app.registerExtension({
    name: "HTML Preview",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "Example") {
            return
        }

        function populate(text) {
            if (this.widgets) {
                for (let i = 1; i < this.widgets.length; i++) {
                    this.widgets[i].onRemove?.();
                }
                this.widgets.length = 1;
            }

            const w = textarea({
                node: this,
                inputName: "text2",
                inputData: ["STRING", { multiline: true }],
                app
            }).widget;
            w.inputEl.style.opacity = 0.6;
            w.value = text;

            requestAnimationFrame(() => {
                const sz = this.computeSize();
                if (sz[0] < this.size[0]) {
                    sz[0] = this.size[0];
                }
                if (sz[1] < this.size[1]) {
                    sz[1] = this.size[1];
                }
                this.onResize?.(sz);
                app.graph.setDirtyCanvas(true, false);
            });
        }

        // When the node is executed we will be sent the input text, display this in the widget
        // const onExecuted = nodeType.prototype.onExecuted;
        // nodeType.prototype.onExecuted = function (message) {
        //     onExecuted?.apply(this, arguments);
        //     populate.call(this, message.text);
        // };

        // const onConfigure = nodeType.prototype.onConfigure;
        // nodeType.prototype.onConfigure = function () {
        //     onConfigure?.apply(this, arguments);
        //     console.log(this.widgets_values)
        //     if (this.widgets_values?.length) {
        //         populate.call(this, this.widgets_values.slice(+this.widgets_values.length > 1));
        //     }
        // };

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);
            populate.call(this, [1].slice(+[1].length > 1));
        };
    }
});
