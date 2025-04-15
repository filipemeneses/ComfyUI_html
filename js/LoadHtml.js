
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

import { ComfyWidgets } from "../../../scripts/widgets.js";

const NODE_NAME = 'LoadHtml'

// https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/src/extensions/core/uploadImage.ts#L11
const isFileUploadInput = (inputSpec) => {
    const [_, inputOptions] = inputSpec
    if (!inputOptions) return false

    const isFileUploadInput =
        inputOptions['html_file_upload'] === true

    return (
        isFileUploadInput
    )
}

const isHtml = (file) => file.type.startsWith('text/html')


const hasAnnotation = (filepath) => /\[(input|output|temp)\]/i.test(filepath)

const createAnnotation = (filepath, rootFolder = 'input') => !hasAnnotation(filepath) && rootFolder !== 'input' ? ` [${rootFolder}]` : ''

const createPath = (filename, subfolder = '') => subfolder ? `${subfolder}/${filename}` : filename


// https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/src/utils/formatUtil.ts#L228
/** Creates annotated filepath in format used by folder_paths.py */
function createAnnotatedPath(
    item,
    options = {}
) {
    const { rootFolder = 'input', subfolder } = options
    if (typeof item === 'string')
        return `${createPath(item, subfolder)}${createAnnotation(item, rootFolder)}`
    return `${createPath(item.filename ?? '', item.subfolder)}${item.type ? createAnnotation(item.type, rootFolder) : ''
        }`
}

const findFileComboWidget = (node, inputName) =>
    node.widgets.find((w) => w.name === inputName)

function useValueTransform(
    transform,
    initialValue
) {
    let internalValue = initialValue
    let cachedValue = transform(initialValue)
    let isChanged = false

    return {
        get: () => {
            if (!isChanged) return cachedValue
            cachedValue = transform(internalValue)
            return cachedValue
        },
        set: (value) => {
            isChanged = true
            internalValue = value
        }
    }
}
const useNodeDragAndDrop = (node, options) => {
    const { onDragOver, onDrop, fileFilter = () => true } = options

    const hasFiles = items => !!Array.from(items).find(f => f.kind === "file")

    const filterFiles = files => Array.from(files).filter(fileFilter)

    const hasValidFiles = files => filterFiles(files).length > 0

    const isDraggingFiles = e => {
        if (!e?.dataTransfer?.items) return false
        return onDragOver?.(e) ?? hasFiles(e.dataTransfer.items)
    }

    const isDraggingValidFiles = e => {
        if (!e?.dataTransfer?.files) return false
        return hasValidFiles(e.dataTransfer.files)
    }

    node.onDragOver = isDraggingFiles

    node.onDragDrop = function (e) {
        if (!isDraggingValidFiles(e)) return false

        const files = filterFiles(e.dataTransfer.files)
        void onDrop(files)
        return true
    }
}

/**
 * Chain multiple callbacks together.
 *
 * @param originalCallback - The original callback to chain.
 * @param callbacks - The callbacks to chain.
 * @returns A new callback that chains the original callback with the callbacks.
 */
export const useChainCallback = (originalCallback, ...callbacks) => {
    return function (...args) {
        originalCallback?.call(this, ...args)
        callbacks.forEach(callback => callback.call(this, ...args))
    }
}

/**
 * Creates a file input for a node.
 */
export function useNodeFileInput(node, options) {
    const {
        accept,
        allow_batch = false,
        fileFilter = () => true,
        onSelect
    } = options

    let fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = accept ?? "*"
    fileInput.multiple = allow_batch

    fileInput.onchange = () => {
        if (fileInput?.files?.length) {
            const files = Array.from(fileInput.files).filter(fileFilter)
            if (files.length) onSelect(files)
        }
    }

    node.onRemoved = useChainCallback(node.onRemoved, () => {
        if (fileInput) {
            fileInput.onchange = null
            fileInput = null
        }
    })

    return {
        openFileSelection: () => fileInput?.click()
    }
}

/**
 * Adds paste handling to a node
 */
export const useNodePaste = (node, options) => {
    const { onPaste, fileFilter = () => true, allow_batch = false } = options

    node.pasteFiles = function (files) {
        const filteredFiles = Array.from(files).filter(fileFilter)
        if (!filteredFiles.length) return false

        const paste = allow_batch ? filteredFiles : filteredFiles.slice(0, 1)

        void onPaste(paste)
        return true
    }
}


const PASTED_IMAGE_EXPIRY_MS = 2000
const uploadFile = async (file, isPasted) => {
    const body = new FormData()
    body.append("image", file)
    if (isPasted) body.append("subfolder", "pasted")

    const resp = await api.fetchApi("/upload/image", {
        method: "POST",
        body
    })

    if (resp.status !== 200) {
        // useToastStore().addAlert(resp.status + " - " + resp.statusText)
        return
    }

    const data = await resp.json()
    return data.subfolder ? `${data.subfolder}/${data.name}` : data.name
}

export const useNodeImageUpload = (node, options) => {
    const { fileFilter, onUploadComplete, allow_batch, accept } = options

    const isPastedFile = file =>
        file.name === "image.png" &&
        file.lastModified - Date.now() < PASTED_IMAGE_EXPIRY_MS

    const handleUpload = async file => {
        try {
            const path = await uploadFile(file, isPastedFile(file))
            if (!path) return
            return path
        } catch (error) {
            useToastStore().addAlert(String(error))
        }
    }

    const handleUploadBatch = async files => {
        const paths = await Promise.all(files.map(handleUpload))
        const validPaths = paths.filter(p => !!p)
        if (validPaths.length) onUploadComplete(validPaths)
        return validPaths
    }

    // Handle drag & drop
    useNodeDragAndDrop(node, {
        fileFilter,
        onDrop: handleUploadBatch
    })

    // Handle paste
    useNodePaste(node, {
        fileFilter,
        allow_batch,
        onPaste: handleUploadBatch
    })

    // Handle file input
    const { openFileSelection } = useNodeFileInput(node, {
        fileFilter,
        allow_batch,
        accept,
        onSelect: handleUploadBatch
    })

    return { openFileSelection, handleUpload }
}

export function addToComboValues(widget, value) {
    if (!widget.options) widget.options = { values: [] }
    if (!widget.options.values) widget.options.values = []
    if (!widget.options.values.includes(value)) {
        widget.options.values.push(value)
    }
}


const useImageUploadWidget = () => {
    const widgetConstructor = (
        node,
        inputName,
        inputData
    ) => {
        const inputOptions = inputData[1] ?? {}
        const { imageInputName, allow_batch, image_folder = 'input' } = inputOptions

        const accept = ['html']
        const fileFilter = isHtml
        // @ts-expect-error InputSpec is not typed correctly
        const fileComboWidget = findFileComboWidget(node, inputName)
        const initialFile = `${fileComboWidget.value}`
        const formatPath = (value) =>
            // @ts-expect-error InputSpec is not typed correctly
            createAnnotatedPath(value, { rootFolder: image_folder })

        const transform = (internalValue) => {
            if (!internalValue) return initialFile
            if (Array.isArray(internalValue))
                return allow_batch
                    ? internalValue.map(formatPath)
                    : formatPath(internalValue[0])
            return formatPath(internalValue)
        }

        Object.defineProperty(
            fileComboWidget,
            'value',
            useValueTransform(transform, initialFile)
        )

        // Setup file upload handling
        const { openFileSelection } = useNodeImageUpload(node, {
            // @ts-expect-error InputSpec is not typed correctly
            allow_batch,
            fileFilter,
            accept,
            onUploadComplete: (output) => {
                output.forEach((path) => addToComboValues(fileComboWidget, path))
                // @ts-expect-error litegraph combo value type does not support arrays yet
                fileComboWidget.value = output
                fileComboWidget.callback?.(output)
            }
        })

        // Create the button widget for selecting the files
        const uploadWidget = node.addWidget(
            'button',
            inputName,
            'image',
            () => openFileSelection(),
            {
                serialize: false
            }
        )
        uploadWidget.label = `choose file to upload`

        // Add our own callback to the combo widget to render an image when it changes
        fileComboWidget.callback = function () {
            node.graph?.setDirtyCanvas(true)
        }

        return { widget: uploadWidget }
    }

    return widgetConstructor
}

// https://github.com/Comfy-Org/ComfyUI_frontend/blob/907632a250933335f1a600d9d3c840b188f4bffc/src/extensions/core/uploadImage.ts#L36
app.registerExtension({
    name: "HTML Load",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        const { input } = nodeData ?? {}
        const { required } = input ?? {}
        if (nodeData.name !== NODE_NAME) {
            return
        }

        const found = Object.entries(required).find(([_, input]) =>
            isFileUploadInput(input)
        )
        if (!found) return

        // If media combo input found, attach upload input
        const [inputName, inputSpec] = found
        const onNodeCreated = nodeType.prototype.onNodeCreated
        // When the SaveImage node is created we want to override the serialization of the output name widget to run our S&R
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments)

            console.log(`1zz`)

            this.fileUploadWidget = useImageUploadWidget()(this, inputName, { ...inputSpec, inputName })

            return r
        }
    }
});
