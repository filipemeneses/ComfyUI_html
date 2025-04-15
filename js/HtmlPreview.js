import { app } from "../../scripts/app.js";

const NODE_NAME = 'HtmlPreview'

// Register a new node type
app.registerExtension({
    name: "HTML Preview",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_NAME) {
            return
        }

        nodeType.prototype.addOrUpdateIframe = function ({
            html,
            width,
            height,
            scale,
            isPortrait
        }) {
            const normalizeWidth = (isPortrait ? width : height) * scale;
            const normalizeHeight = (isPortrait ? height : width) * scale;
            const widthPx = `${normalizeWidth}px`
            const heightPx = `${normalizeHeight}px`


            const node = this;
            function resize() {
                requestAnimationFrame(() => {
                    const sz = node.computeSize();
                    if (sz[1] < node.size[1]) {
                        node.size[1] = normalizeHeight + 20 + sz[1]
                    }
                    node.size[0] = normalizeWidth + 20

                    node.onResize?.(normalizeWidth, normalizeHeight);
                    app.graph.setDirtyCanvas(true, false);
                });
            }
            function refreshIframeSize(iframeEl) {
                iframeEl.style.minWidth = widthPx
                iframeEl.style.minHeight = heightPx
                iframeEl.style.maxWidth = widthPx
                iframeEl.style.maxHeight = heightPx
            }

            if (!this.iframeWidget) {
                const iframeEl = document.createElement("iframe");
                iframeEl.style.border = 'none'
                refreshIframeSize(iframeEl);

                const widget = this.addDOMWidget("html", "customtext", iframeEl, {
                    getValue() {
                        return iframeEl.value;
                    },
                    setValue(v) {
                        iframeEl.srcdoc = v;
                    },
                });
                widget.iframeEl = iframeEl;


                this.iframeWidget = widget;
                refreshIframeSize(iframeEl);
                resize();
            }
            this.iframeWidget.iframeEl.onload = () => {
            }
            refreshIframeSize(this.iframeWidget.iframeEl);
            resize();
            this.iframeWidget.iframeEl.srcdoc = html;
        }


        const sanitizeMessage = (msg, fallback) => Array.isArray(msg) && msg?.length ? msg[0] : fallback

        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            onExecuted?.apply(this, arguments);
            const html = sanitizeMessage(message?.html, '')
            const width = sanitizeMessage(message?.width, 0)
            const height = sanitizeMessage(message?.height, 0)
            const scale = sanitizeMessage(message?.scale, 1)
            const isPortrait = sanitizeMessage(message?.is_portrait, true)

            this.addOrUpdateIframe({
                html,
                width,
                height,
                scale,
                isPortrait
            });
        };

        // const onConfigure = nodeType.prototype.onConfigure;
        // nodeType.prototype.onConfigure = function () {
        //     onConfigure?.apply(this, arguments);
        //     console.log(this.widgets_values)
        //     if (this.widgets_values?.length) {
        //         populate.call(this, this.widgets_values.slice(+this.widgets_values.length > 1));
        //     }
        // };

        // const onNodeCreated = nodeType.prototype.onNodeCreated;
        // nodeType.prototype.onNodeCreated = function () {
        //     onNodeCreated?.apply(this, arguments);
        //     // populate.call(this, [1].slice(+[1].length > 1));
        // };
    }
});
