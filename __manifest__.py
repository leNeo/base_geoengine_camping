# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{
 'name': 'Geospatial support of camping',
 'version': '19.0.1.0.0',
 'author': 'Caravanes Treyvaud S.A.',
 'category': 'GeoBI',
 'license': 'AGPL-3',
 'depends': [
     'base',
     'base_geoengine',
     'camping',
 ],
 'data': [
     'views/geo_camping.xml',
     'security/ir.model.access.csv',
 ],
 'assets': {
     'web.assets_backend': [
         'base_geoengine_camping/static/src/js/**/*',
     ],
 },
 'external_dependencies': {'python': ['geojson']},
 'installable': True,
 'application': True,
}
