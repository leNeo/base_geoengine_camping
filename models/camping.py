# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import models, fields, api

from odoo.addons.base_geoengine import geo_model
from odoo.addons.base_geoengine import fields as geo_fields


class Camping(models.Model):
    _inherit = 'camping'

    # the_point = geo_fields.GeoPoint('Adresse Coordinate')
    x_the_point = geo_fields.GeoPoint(string="Adresse Coordinate")
    # default_geom = geo_fields.GeoMultiPolygon('Default geom')
    x_default_geom = geo_fields.GeoMultiPolygon('Default geom')

    def show_places_map(self):
        return {
            'name': 'Camping Places Map',
            # modif 13 'view_type': 'form',
            'view_mode': 'geoengine,form',
            'res_model': 'camping.place',
            'view_id': False,
            'type': 'ir.actions.act_window',
            'target': 'self',
            'nodestroy': True,
            "domain": [["camping_id", "=", self.id]]
        }


class Place(models.Model):
    _inherit = 'camping.place'

    #the_geom = geo_fields.GeoMultiPolygon('Place shape')
    x_the_geom = geo_fields.GeoMultiPolygon('Place shape')

    @api.onchange('camping_id')
    def on_change_camping(self):
        if not self.x_the_geom:
            self.x_the_geom = self.camping_id.x_default_geom

class Parc(models.Model):
    _inherit = 'camping.parc'

    x_the_geom = geo_fields.GeoMultiPolygon('Parc shape')

    @api.onchange('camping_id')
    def on_change_camping(self):
        if not self.x_the_geom:
            self.x_the_geom = self.camping_id.x_default_geom
