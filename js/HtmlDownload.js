import { app } from "../../scripts/app.js";

const NODE_NAME = 'HtmlDownload'

app.registerExtension({
    name: "HTML Download",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_NAME) {
            return
        }

        const sanitizeMessageAttr = (msg, fallback) => Array.isArray(msg) && msg?.length ? msg.join('') : fallback
        const sanitizeMessage = message => {
            const filename = sanitizeMessageAttr(message?.filename, 'myFile')
            const temp_url = sanitizeMessageAttr(message?.temp_url, '')
            return {
                filename,
                temp_url,
            }
        }
        const downloadHtmlAsFile = ({ filename, temp_url }) => {
            console.log('downloadHtmlAsFile', filename, temp_url)
            const link = document.createElement('a');
            link.href = temp_url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            onExecuted?.apply(this, arguments);

            downloadHtmlAsFile(sanitizeMessage(message));
        };
    }
});
