from . import models

# Monkey-patch the JavaScript asset minifier to skip rjsmin for files in
# /lib/ directories. These are third-party pre-minified libraries (like
# OpenLayers ol.js) that contain ES6 template literals which rjsmin 1.2.x
# cannot handle — it silently truncates the output.
from odoo.addons.base.models.assetsbundle import JavascriptAsset

_original_minify = JavascriptAsset.minify

def _safe_minify(self):
    if self.url and '/lib/' in self.url:
        return self.with_header(self.content)
    return _original_minify(self)

JavascriptAsset.minify = _safe_minify
