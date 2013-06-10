/**

TT: Based on the layerproperties plugin of gxp
**/


/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = getlayer
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: getlayer(config)
 *
 *    Plugin for showing the properties of a selected layer from the map.
 */
gxp.plugins.GetLayer = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_getlayer */
    ptype: "gxp_getlayer",
    
    /** api: config[menuText]
     *  ``String``
     *  Text for layer properties menu item (i18n).
     */
    menuText: "Get Layer",

    /** api: config[toolTip]
     *  ``String``
     *  Text for layer properties action tooltip (i18n).
     */
    toolTip: "Get Layer",
    
    /** api: config[layerPanelConfig]
     *  ``Object`` Additional configuration options for the layer type specific
     *  properties panels, keyed by xtype, e.g.:
     *
     *  .. code-block:: javascript
     *
     *      layerPanelConfig: {
     *          "gxp_wmslayerpanel": {rasterStyling: true}
     *      }
     */
    
    constructor: function(config) {
        gxp.plugins.GetLayer.superclass.constructor.apply(this, arguments);
        
        if (!this.outputConfig) {
            this.outputConfig = {
                width: 325,
                autoHeight: true
            };
        }
    },
        
    /** api: method[addActions]
     */
    addActions: function() {
        var actions = gxp.plugins.GetLayer.superclass.addActions.apply(this, [{
            menuText: this.menuText,
            iconCls: "gxp-icon-layerproperties",
            disabled: true,
            tooltip: this.toolTip,
            handler: function() {
                this.removeOutput();
                this.addOutput();
            },
            scope: this
        }]);
        var getlayerAction = actions[0];

        this.target.on("layerselectionchange", function(record) {
            getlayerAction.setDisabled(
                !record || !record.get("properties")
            );
        }, this);
        return actions;
    },
    
    addOutput: function(config) {
        config = config || {};
        var record = this.target.selectedLayer;
        //console.log(record.get("properties"));
        var title = record.get("title");
        var name =  record.get("name");
        //console.log(record);
        
        var origCfg = this.initialConfig.outputConfig || {};
        this.outputConfig.title = origCfg.title ||
            this.menuText + ": " + record.get("title");
        this.outputConfig.shortTitle = record.get("title");
        
        //TODO create generic gxp_layerpanel
        //var xtype = record.get("properties") || "gxp_layerpanel";
        var xtype = "panel";
        var panelConfig = this.layerPanelConfig;
        if (panelConfig && panelConfig[xtype]) {
            Ext.apply(config, panelConfig[xtype]);
        }
        
        var output = gxp.plugins.GetLayer.superclass.addOutput.call(this, Ext.apply({
            xtype: xtype,
            authorized: this.target.isAuthorized(),
            layerRecord: record,
            source: this.target.getSource(record),
            defaults: {
                style: "padding: 10px",
                autoHeight: this.outputConfig.autoHeight
            },
            items: [
            {
            	html: 'Kopieer onderstaande WMS link'
            },{
				fieldLabel: 'WMS link',
				xtype: 'textfield',
				heigth: '24px',
				marging: '5px',
				name: 'wmslink',
				width: 300,
				align: 'right',
				value: 'http://model.geodan.nl/geoserver/ows?service=WMS&version=1.1.0&request=GetMap&layers='+name+'&styles=&srs=EPSG:28992&format=image%2Fpng',
				id: 'wmslink',
			},{
				html: 'of:'
			},{
				xtype: 'ux-linkbutton',
				text: "Download shapefile",
				href: "/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName="+name+"&outputFormat=SHAPE-ZIP"
			}
            ]
        }, config));
        output.on({
            added: function(cmp) {
                if (!this.outputTarget) {
                    cmp.on("afterrender", function() {
                        cmp.ownerCt.ownerCt.center();
                    }, this, {single: true});
                }
            },
            scope: this
        });
        return output;
    }
        
});

Ext.preg(gxp.plugins.GetLayer.prototype.ptype, gxp.plugins.GetLayer);
