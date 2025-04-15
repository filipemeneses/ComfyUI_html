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

    # def check_lazy_status(self, image, string_field, int_field, float_field, print_to_screen):
    #     """
    #         Return a list of input names that need to be evaluated.

    #         This function will be called if there are any lazy inputs which have not yet been
    #         evaluated. As long as you return at least one field which has not yet been evaluated
    #         (and more exist), this function will be called again once the value of the requested
    #         field is available.

    #         Any evaluated inputs will be passed as arguments to this function. Any unevaluated
    #         inputs will have the value None.
    #     """
    #     if print_to_screen == "enable":
    #         return ["int_field", "float_field", "string_field"]
    #     else:
    #         return []

    # """
    #     The node will always be re executed if any of the inputs change but
    #     this method can be used to force the node to execute again even when the inputs don't change.
    #     You can make this node return a number or a string. This value will be compared to the one returned the last time the node was
    #     executed, if it is different the node will be executed again.
    #     This method is used in the core repo for the LoadImage node where they return the image hash as a string, if the image hash
    #     changes between executions the LoadImage node is executed again.
    # """
    #@classmethod
    #def IS_CHANGED(s, image, string_field, int_field, float_field, print_to_screen):
    #    return ""

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
    "HtmlPreview": HtmlPreview
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "HtmlPreview": "HTML Preview",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']