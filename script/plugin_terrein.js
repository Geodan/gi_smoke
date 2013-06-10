Ext.namespace("gxp.plugins");
       
gxp.plugins.Terrein = Ext.extend(gxp.plugins.Tool, {
    ptype: "gxp_terrein",
    menuText: "Terrein",
    tooltip: "Terrein",
    constructor: function(config) {
        gxp.plugins.Terrein.superclass.constructor.apply(this, arguments);
    },
    destroy: function() {
        gxp.plugins.Terrein.superclass.destroy.apply(this, arguments);
    },
    addActions: function() {
    	var map = this.target.mapPanel.map;
        OpenLayers.Control.BoxExtent = OpenLayers.Class(OpenLayers.Control, {
            	type: OpenLayers.Control.TYPE_TOOL,
    			draw: function () {
					this.handler = new OpenLayers.Handler.Box( this, 
						{"done": this.notice});
					//this.handler.activate();
				},
    			notice: function (bounds) {
    				
    				Ext.MessageBox.show({
						msg: 'Model area is being created',
						width: 300,
						wait: true,
						waitConfig: {interval: 200}
					});
					ll = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.left, bounds.bottom));
					ur = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.right, bounds.top));
    				
					/* Check for maximum size */
					var newbounds = new OpenLayers.Bounds();
					newbounds.extend(ll);
					newbounds.extend(ur);
    				var width = Math.abs(newbounds.getWidth());
    				var height = Math.abs(newbounds.getHeight());
    				var maxsize = 5000 * 10000;
    				console.log(width * height);
    				//TODO: hier klopt nog geen klap van, dit gaat niet in meters maar in graden lijkt het
    				if (width * height > maxsize) {
						Ext.MessageBox.show({
							msg: 'Fout: gebied te groot.',
							width: 300,
							wait: false
						});
						return;
					}
    				
					/* Fire up WPS */
					//OpenLayers.loadURL('./php/create_landscape.php?lower=' + ll.lat + '&left=' + ll.lon + '&upper=' + ur.lat + '&right=' + ur.lon + '', '', '', landscapeReady);
					name = "test";
					var userid = '0';
					Ext.Ajax.request({
					   //url: './php/create_subset_terrein.php?lower=' + ll.lat + '&left=' + ll.lon + '&upper=' + ur.lat + '&right=' + ur.lon + '',
					   //url: '../wildfire/pywps/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=makeSubset&datainputs=[lower='+ll.lat+';left='+ll.lon+';upper='+ur.lat+';right='+ur.lon+';name='+name+']',
					   url: '/geoserver/ows?service=WPS&request=execute&identifier=py:wildfire_makesubset&datainputs=userid='+userid+';lower='+ll.lat+';left='+ll.lon+';upper='+ur.lat+';right='+ur.lon+';name='+name+'&RawDataOutput=string=mimeType=%22application/json%22',
					   //success: wpsRunning
					   success: wpsCallback
					   //failure: alert('Error initializing model'),
					   //headers: {
						//   'my-header': 'foo'
					   //},
					   //params: { foo: 'bar' }
					});
					this.deactivate();
				},
				CLASS_NAME: "OpenLayers.Control.BoxExtent"
			});

    	
    		var terreinControl = new OpenLayers.Control.BoxExtent();
    	
    		var actions = [new GeoExt.Action({
				tooltip: this.tooltip,
				text: "Selecteer terrein",
				xtype: 'button',
				//width: 150,
				menuText: this.menuText,
				iconCls: "gxp-areaselect-icon",
				enableToggle: true,
				pressed: false,
				allowDepress: true,
				control: terreinControl,
				map: this.target.mapPanel.map,
				toggleGroup: this.toggleGroup})];
			return gxp.plugins.Terrein.superclass.addActions.apply(this, [actions]);
    	}
});
Ext.preg(gxp.plugins.Terrein.prototype.ptype, gxp.plugins.Terrein);
