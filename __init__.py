from .util import tensor_to_pil,  image_to_base64 
from comfy.cli_args import args
from PIL.PngImagePlugin import PngInfo
import json
import os
import folder_paths

class HtmlPreview:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "width": ("INT", {"default": 375, "min": 0}),
                "height": ("INT", {"default": 667, "min": 0}),
                "scale": ("FLOAT", {
                    "default": 1,
                    "min": 0.0,
                    "max": 10.0,
                    "step": 0.01,
                    "round": 0.001
                }),
                "is_portrait": ("BOOLEAN", {"default": True}),
                "html": ("STRING", {
                    "forceInput": True,
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            }
        }

    INPUT_IS_LIST = True
    RETURN_TYPES = ("STRING",)
    FUNCTION = "runHtmlPreview"
    OUTPUT_NODE = True
    OUTPUT_IS_LIST = (True,)

    CATEGORY = "utils"

    def runHtmlPreview(self, width, height, scale, is_portrait, html, unique_id=None, extra_pnginfo=None):
        if unique_id is not None and extra_pnginfo is not None:
            if not isinstance(extra_pnginfo, list):
                print("Error: extra_pnginfo is not a list")
            elif (
                not isinstance(extra_pnginfo[0], dict)
                or "workflow" not in extra_pnginfo[0]
            ):
                print("Error: extra_pnginfo[0] is not a dict or missing 'workflow' key")
            else:
                workflow = extra_pnginfo[0]["workflow"]
                node = next(
                    (x for x in workflow["nodes"] if str(x["id"]) == str(unique_id[0])),
                    None,
                )
                if node:
                    node["widgets_values"] = [html]

        return {"ui": {"html": html, "width": width, "height": height, "scale": scale, "is_portrait": is_portrait}, "result": (html,)}


class HtmlDownload:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "filename": ("STRING", {"default": "myhtml.html"}),
                "html": ("STRING", {
                    "forceInput": True,
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "runHtmlDownload"
    OUTPUT_NODE = True

    CATEGORY = "utils"

    def runHtmlDownload(self, filename, html, unique_id=None, extra_pnginfo=None):
        if unique_id is not None and extra_pnginfo is not None:
            if not isinstance(extra_pnginfo, list):
                print("Error: extra_pnginfo is not a list")
            elif (
                not isinstance(extra_pnginfo[0], dict)
                or "workflow" not in extra_pnginfo[0]
            ):
                print("Error: extra_pnginfo[0] is not a dict or missing 'workflow' key")
            else:
                workflow = extra_pnginfo[0]["workflow"]
                node = next(
                    (x for x in workflow["nodes"] if str(x["id"]) == str(unique_id[0])),
                    None,
                )
                if node:
                    node["widgets_values"] = [html]

        # Create a temporary file in the output directory
        temp_dir = folder_paths.get_temp_directory()
        temp_filename = f"temp_{filename}"
        temp_path = os.path.join(temp_dir, temp_filename)

        # Save the HTML to the temporary file
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(html)

        # Create the URL for the temporary file using ComfyUI's file serving mechanism
        temp_url = f"/view?filename={temp_filename}&type=temp"

        return {"ui": {"filename": filename, "temp_url": temp_url}, "result": ()}


class SaveHtml:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.prefix_append = ""
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "html": ("STRING", {"tooltip": "The HTML to save.", "forceInput": True}),
                "filename_prefix": ("STRING", {"default": "ComfyUI", "tooltip": "The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% or %Empty Latent Image.width% to include values from nodes."})
            },
            "hidden": {
                "prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "save_html"

    OUTPUT_NODE = True

    CATEGORY = "util"
    DESCRIPTION = "Saves the input HTML to your ComfyUI output directory."

    def save_html(self, html, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
        filename_prefix += self.prefix_append
        # Use get_save_image_path but with dummy dimensions since we're saving HTML
        full_output_folder, filename, counter, subfolder, filename_prefix = folder_paths.get_save_image_path(filename_prefix, self.output_dir, 1, 1)

        # Generate filename
        filename_with_counter = f"{filename}_{counter:05}.html"
        full_path = os.path.join(full_output_folder, filename_with_counter)

        # Save the HTML file
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(html)

        results = [{
            "filename": filename_with_counter,
            "subfolder": subfolder,
            "type": self.type
        }]

        return { "ui": {  }, "result": () }


class SingleImageToBase64:
    @classmethod
    def INPUT_TYPES(self):
        return {"required": {
            "images": ("IMAGE",),
        }}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("base64Image",)

    FUNCTION = "convert"
    OUTPUT_NODE = False

    CATEGORY = "utils"

    def convert(self, images):
        i = images[0]
        img = tensor_to_pil(i)
        base64Image = image_to_base64(img)

        return {"ui": {"base64Image": base64Image}, "result": (base64Image,)}


class SingleImageToBase64KeepMetadata:
    @classmethod
    def INPUT_TYPES(self):
        return {"required": {
            "images": ("IMAGE",),
        },
            "hidden": {"extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("base64Image",)

    FUNCTION = "convert"
    OUTPUT_NODE = False

    CATEGORY = "utils"

    def convert(self, images, extra_pnginfo=None):
        i = images[0]
        img = tensor_to_pil(i)
        metadata = None
        if not args.disable_metadata:
            metadata = PngInfo()
            if extra_pnginfo is not None:
                for x in extra_pnginfo:
                    metadata.add_text(x, json.dumps(extra_pnginfo[x]))

        base64Image = image_to_base64(img, pnginfo=metadata)

        return {"ui": {"base64Image": base64Image}, "result": (base64Image,)}

class LoadHtml:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if f.endswith('.html') and os.path.isfile(os.path.join(input_dir, f))]
        return {"required":
                    {"html_file": (sorted(files), {"html_file_upload": True})},
                }

    CATEGORY = "html"

    RETURN_TYPES = ("STRING",)
    FUNCTION = "load_html"
    def load_html(self, html_file):
        html_path = folder_paths.get_annotated_filepath(html_file)

        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        return (html_content,)

    @classmethod
    def IS_CHANGED(s, html_file):
        html_path = folder_paths.get_annotated_filepath(html_file)
        m = hashlib.sha256()
        with open(html_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(s, html_file):
        if not folder_paths.exists_annotated_filepath(html_file):
            return "Invalid HTML file: {}".format(html_file)
        
        return True



# Set the web directory, any .js file in that directory will be loaded by the frontend as a frontend extension
WEB_DIRECTORY = "./js"


# Add custom API routes, using router
# from aiohttp import web
# from server import PromptServer

# @PromptServer.instance.routes.get("/hello")
# async def get_hello(request):
#     return web.json_response("hello")


# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = {
    "LoadHtml": LoadHtml,
    "HtmlPreview": HtmlPreview,
    "HtmlDownload": HtmlDownload,
    "SaveHtml": SaveHtml,
    "SingleImageToBase64": SingleImageToBase64,
    "SingleImageToBase64KeepMetadata": SingleImageToBase64KeepMetadata,
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "LoadHtml": "Load HTML",
    "HtmlPreview": "HTML Preview",
    "HtmlDownload": "HTML Download",
    "SaveHtml": "Save HTML",
    "SingleImageToBase64": "Single image to base64",
    "SingleImageToBase64KeepMetadata": "Single image to base64 keep metadata",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']