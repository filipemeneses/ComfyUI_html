import { app } from "../../scripts/app.js";

const NODE_NAME = 'HtmlDownload'

app.registerExtension({
    name: "HTML Download",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_NAME) {
            return
        }

        const sanitizeMessageAttr = (msg, fallback) => Array.isArray(msg) && msg?.length ? msg[0] : fallback
        const sanitizeMessage = message => {
            const html = sanitizeMessageAttr(message?.html, '')
            const filename = sanitizeMessageAttr(message?.filename, 'myFile')
            return {
                filename,
                html,
            }
        }
        const downloadHtmlAsFile = ({ filename, html }) => {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            onExecuted?.apply(this, arguments);

            downloadHtmlAsFile(sanitizeMessage(message));
        };
    }
});
