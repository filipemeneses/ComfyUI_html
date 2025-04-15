import { app } from "../../scripts/app.js";

const NODE_NAME = 'SaveHtml'

app.registerExtension({
    name: "Save HTML",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_NAME) {
            return
        }
        const parts = {
            d: (d) => d.getDate(),
            M: (d) => d.getMonth() + 1,
            h: (d) => d.getHours(),
            m: (d) => d.getMinutes(),
            s: (d) => d.getSeconds()
        }
        const format =
            Object.keys(parts)
                .map((k) => k + k + '?')
                .join('|') + '|yyy?y?'

        function formatDate(text, date) {
            return text.replace(new RegExp(format, 'g'), (text) => {
                if (text === 'yy') return (date.getFullYear() + '').substring(2)
                if (text === 'yyyy') return date.getFullYear().toString()
                if (text[0] in parts) {
                    const p = parts[text[0]](date)
                    return (p + '').padStart(text.length, '0')
                }
                return text
            })
        }

        function applyTextReplacements(
            allNodes,
            value
        ) {
            return value.replace(/%([^%]+)%/g, function (match, text) {
                const split = text.split('.')
                if (split.length !== 2) {
                    // Special handling for dates
                    if (split[0].startsWith('date:')) {
                        return formatDate(split[0].substring(5), new Date())
                    }

                    if (text !== 'width' && text !== 'height') {
                        // Dont warn on standard replacements
                        console.warn('Invalid replacement pattern', text)
                    }
                    return match
                }

                // Find node with matching S&R property name
                let nodes = allNodes.filter(
                    (n) => n.properties?.['Node name for S&R'] === split[0]
                )
                // If we cant, see if there is a node with that title
                if (!nodes.length) {
                    nodes = allNodes.filter((n) => n.title === split[0])
                }
                if (!nodes.length) {
                    console.warn('Unable to find node', split[0])
                    return match
                }

                if (nodes.length > 1) {
                    console.warn('Multiple nodes matched', split[0], 'using first match')
                }

                const node = nodes[0]

                const widget = node.widgets?.find((w) => w.name === split[1])
                if (!widget) {
                    console.warn('Unable to find widget', split[1], 'on node', split[0], node)
                    return match
                }
                return ((widget.value ?? '') + '').replaceAll(
                    // eslint-disable-next-line no-control-regex
                    /[/?<>\\:*|"\x00-\x1F\x7F]/g,
                    '_'
                )
            })
        }

        if (
            nodeData.name === 'SaveHtml'
        ) {
            const onNodeCreated = nodeType.prototype.onNodeCreated
            // When the SaveImage node is created we want to override the serialization of the output name widget to run our S&R
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated
                    ? // @ts-expect-error fixme ts strict error
                    onNodeCreated.apply(this, arguments)
                    : undefined

                // @ts-expect-error fixme ts strict error
                const widget = this.widgets.find((w) => w.name === 'filename_prefix')
                // @ts-expect-error fixme ts strict error
                widget.serializeValue = () => {
                    // @ts-expect-error fixme ts strict error
                    return applyTextReplacements(app.graph.nodes, widget.value)
                }

                return r
            }
        }
    }
});
