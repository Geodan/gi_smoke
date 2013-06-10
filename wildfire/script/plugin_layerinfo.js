
function zeroPad(num,count)
{
	var numZeropad = num + '';
	while(numZeropad.length < count) {
		numZeropad = "0" + numZeropad;
	}
	return numZeropad;
}

Ext.namespace("gxp.plugins");
var mypolygon;
gxp.plugins.Layerinfo = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_navigation */
    ptype: "gxp_layerinfo",
    
    /** api: config[menuText]
     *  ``String``
     *  Text for navigation menu item (i18n).
     */
    menuText: "Layer info",

    /** api: config[tooltip]
     *  ``String``
     *  Text for navigation action tooltip (i18n).
     */
    tooltip: "Get info about a surface",

    /** private: method[constructor]
     */
    constructor: function(config) {
        gxp.plugins.Layerinfo.superclass.constructor.apply(this, arguments);
    },

    /** api: method[addActions]
     */
    addActions: function() {
    	
    	OpenLayers.Control.PointLoc = OpenLayers.Class(OpenLayers.Control, {
    			type: OpenLayers.Control.TYPE_TOOL,
    			draw: function () {
					this.handler = new OpenLayers.Handler.Polygon( control, 
						{"done": this.notice});
				},
				layerinfoResult: function(response){
					var title = "";
					var string = "";
					var obj = {};
					try{
						obj = JSON.parse(response.responseText);
						title = "Resultaat";
						for (var i=0; i<obj.payload.length; i++){
							var record = obj.payload[i];
							string = string + '<b>' + record.description + '</b><br>';
							for (type in record.stats) {
								string = string + type + ': '+ record.stats[type] + '<br>';
							}
						}
					}
					catch(err){
						title = err;
						string = response.responseText;
					}
					Ext.MessageBox.show({
							title: title,
							width: 300,
							msg:string
					});
				},

				notice: function (path) {
					Ext.MessageBox.show({
							msg: 'Getting data',
							width: 300,
							wait: true,
							waitConfig: {interval: 200}
					});
					
					var fromProjection = new OpenLayers.Projection("EPSG:900913");
					var toProjection = new OpenLayers.Projection("EPSG:28992");
					
					path.transform(fromProjection,toProjection);
					var polygon = path.toString();

					if (!polygon) {
						Ext.MessageBox.show({
							msg: 'Fout: Geen geldige polygoon',
							width: 300,
							wait: false
						});
					}
					else {
						Ext.Ajax.request({
						   url: '/geoserver/ows?service=WPS&request=execute&version=1.0.0&identifier=py:aggregated_data&datainputs=srid=28992;geom='+polygon+';datasets=aggregated_data;&RawDataOutput=string=mimeType="application/json"',
						   success: this.layerinfoResult,
						   timeout: 1200,
						   failure: function(error){
						   	   Ext.MessageBox.show({
						   		title: 'Fout',
						   		msg: error,
						   		width: 300,
						   		wait: false
						   	   });
						   }
						   //headers: {
						   //	'my-header': 'foo'
						   // },
						   //params: { foo: 'bar' }
						});
					}
					//Deactivate directly after firing
					this.deactivate();
				},
				//CLASS_NAME: "OpenLayers.Control.PointLoc"
    	});
    	
    	var map = this.target.mapPanel.map;
    	var control = new OpenLayers.Control.PointLoc();
    	
        var actions = [new GeoExt.Action({
            tooltip: this.tooltip,
            text: "Layerinfo",
            xtype: 'button',
            width: 150,
            menuText: this.menuText,
            iconCls: "gxp-ignite-icon",
            enableToggle: true,
            pressed: false,
            allowDepress: false,
            control: control,
            map: this.target.mapPanel.map,
            toggleGroup: this.toggleGroup})];
        return gxp.plugins.Layerinfo.superclass.addActions.apply(this, [actions]);
    }
        
});

Ext.preg(gxp.plugins.Layerinfo.prototype.ptype, gxp.plugins.Layerinfo);
