from .util import tensor_to_pil,  image_to_base64 
from comfy.cli_args import args
from PIL.PngImagePlugin import PngInfo
import json

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

class SingleImageToBase64:
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
    OUTPUT_NODE = True

    CATEGORY = "utils"

    # INPUT_IS_LIST = False
    # OUTPUT_IS_LIST = (False,False,)

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
    "HtmlPreview": HtmlPreview,
    "SingleImageToBase64": SingleImageToBase64,
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "HtmlPreview": "HTML Preview",
    "SingleImageToBase64": "Single image to base64",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']