	/***
		Making a window for model results
		Example from: http://api.geoext.org/1.1/examples/wms-tree.js
		
		TODO: perhaps we don't have to create an complete new window every time. Updating the source data might do..
		***/

	function rookpluimresults(processid){
		this.chart;
		this.processid = processid;
		this.firstDraw = function(data) {
			nv.addGraph(function() {
				//BUG in cumulativelinechart: http://stackoverflow.com/questions/12548640/nvd3-line-chart-with-realtime-data
				//var chart = nv.models.cumulativeLineChart()
				var chart = nv.models.lineChart()
					.forceY([0,300])
					.forceX([0,10000])
					.x(function(d) { return d[0] })
					.y(function(d) { return d[1] })
					.color(d3.scale.category10().range());
			  chart.xAxis
				.axisLabel('Afstand tot bron (m)')
				.tickFormat(d3.format(',f'));
			  chart.yAxis
			  	.axisLabel('Hoogte (m)')
				.tickFormat(d3.format(',f'));
			  d3.select('#profiel svg')
				.datum(data)
				.transition().duration(100)
				.call(chart);
			  
			  nv.utils.windowResize(function() { 
				d3.select('#profiel svg').call(chart) 
			  });
			  self.chart = chart;
			  return chart;
			});
		}
		this.updateChart = function(data){
			if (self.chart){
				data.forEach(function(d){
					d.x = d[0];
					d.y = d[1];
				});
				d3.select('#profiel svg').datum(data)
					.transition().duration(100)
					.call(self.chart);
				nv.utils.windowResize(self.chart.update);
			}
			else console.warn('No chart object available to draw on.');
		}
		
		
		
		var self=this;
		//Grid for params
		this.paramStore = new Ext.data.Store({
		  reader: new Ext.data.XmlReader({
			record: 'Output',
			fields: ['Identifier', 'Title','LiteralData']
		  })
		});
		
		this.processParams = function(response) {
			var node;
			var dq = Ext.DomQuery;
			//XML with namespaces doesn't work in EXT, so we first remove the namespaces.
			//The replace function is now only replacing 'wps' and 'ows' namespaces
			//var xml = response.responseXML;
			var string = response.responseText.replace(/wps:/gi,"");
			var string = string.replace(/ows:/gi,"");
			var xml = StringtoXML(string);
			this.paramStore.loadData(xml);
		}
		
		this.paramsColModel = new Ext.grid.ColumnModel({
			defaults: {
				width: 80,
				sortable: true
			},
			columns: [
				{id: 'Title', header: 'param', width: 150, sortable: true, dataIndex: 'Title'},
				{id: 'LiteralData', header: 'value', width: 80, sortable: true, dataIndex: 'LiteralData'}
			]
		});
		
		this.processid = processid.toString(); //TODO: make non-global
		this.loader =  new GeoExt.tree.WMSCapabilitiesLoader({
            url: OpenLayers.ProxyHost+escape('http://smoke-plume.argoss.nl/geoserver/'+this.processid+'/wms?&version=1.1.1&request=GetCapabilities'),
            layerOptions: {buffer: 0, singleTile: true, ratio: 1},
            layerParams: {'TRANSPARENT': 'TRUE'},
            // customize the createNode method to add a checkbox to nodes
            createNode: function(attr) {
                attr.checked = attr.leaf ? false : undefined;
                return GeoExt.tree.WMSCapabilitiesLoader.prototype.createNode.apply(this, [attr]);
            }
            });
		
        this.root = new Ext.tree.AsyncTreeNode({
			text: 'Model output',
			loader: this.loader
			});
	
		this.parampanel = new Ext.grid.GridPanel({
			store: this.paramStore,
			colModel: this.paramsColModel,
			title: "Parameters",
			autoHeight: true,
			renderTo: 'rookpluiminfopanel'
		});
		/***** START OF weergaveWindow ***/
		this.weergaveWindow = new Ext.Window({
			title: 'Weergave',
			closable: true,
			closeAction: 'hide',
			items: [{
				xtype: 'form',
				itemId: 'afspeelform',
				width: '200',//TODO: without width the panel gets VERY big, why?
				title: 'Afspelen',
				tbar:[
				{
					toolTip: 'terug',
					icon: '/rookpluim/images/icons/silk/icons/control_rewind.png',
					handler: function(){
						self.play();
					}
				},{
					toolTip: 'speel',
					icon: '/rookpluim/images/icons/silk/icons/control_play.png',
					handler: function(){
						self.play();
					}
				},{
					toolTip: 'pauze',
					icon: '/rookpluim/images/icons/silk/icons/control_pause.png',
					handler: function(){
						self.pause();
					}
				},{
					toolTip: 'stop',
					icon: '/rookpluim/images/icons/silk/icons/control_stop.png',
					handler: function(){
						self.stop();
					}
				},{
					toolTip: 'naar einde',
					icon: '/rookpluim/images/icons/silk/icons/control_end.png',
					handler: function(){
						self.stop();
					}
				}
				],
				items:[{
					itemId: 'playtime',
					xtype: 'textfield',
					//fieldLabel: 'Tijd',
					disabled: true
				},{
					xtype: 'slider',
					itemId: 'stepslider',
					//fieldLabel: '',
					//values: [0,0],
					value: 0,
					name: 'stepslider',
					listeners: {
						"drag":function (slider) {
							//var min = slider.thumbs[0].value;
							//var max = slider.thumbs[1].value;
							var max = slider.thumbs[0].value;
							//self.range = max - min;
							self.range = 0;
							self.counter = max;
							self.showStep(max);
						}
					}
				}
				]
				
			},{
				xtype: 'form',
				items: [
				{
					xtype: 'fieldset',
					title: 'Toon simulatie data',
					defaultType: 'checkbox',
					defaults: {
					
					handler: function(object){
							//console.log(object);
							for (i=0;i<modelresults.length;i++){
								self.visibleLayers[object.itemId] = object.checked;
								self.redraw();
							}
						}
					},
					items: [
					{fieldLabel: 'Vector',itemId: 'vector', checked: true},
					{fieldLabel: 'Raster',itemId: 'raster'},
					{fieldLabel: 'Wind',itemId: 'wind'},
					{fieldLabel: 'Rekengrid',itemId: 'rekengrid'},
					{fieldLabel: 'Dwarsprofiel kader',itemId: 'cone'},
					{fieldLabel: 'Dwarsprofiel',itemId: 'profiel'}
					]
				},{
					xtype: 'fieldset',
					title: 'Toon actuele wind data',
					defaults: {
						//width: 150,
					},
					items: [
					{xtype: 'checkbox',	fieldLabel: 'Model',itemId: 'model'},
					{xtype: 'checkbox',	fieldLabel: 'KNMI',itemId: 'knmi'}	
					]
				},{
					xtype: 'fieldset',
					title: 'Toon',
					defaultType: 'checkbox',
					defaults: {
						handler: function(object){
							self.visibleLayers[object.itemId] = object.checked;
							//GRID
							var name = self.layers.grid;
							var arr = app.mapPanel.map.getLayersByName(name);
							arr[0].setVisibility(self.visibleLayers['landgrid']);
							self.redraw();
						}
					},
					
					items: [
					{fieldLabel: 'Land grid',itemId: 'landgrid'}
					]
				}]
			}]
		});
		/***** END OF weergaveWindow ***/

		this.visibleLayers = [];
		
		this.layers = {};
		this.layers.vector = [];
		this.layers.raster = [];
		this.layers.wind = [];
		this.layers.profiel = [];
		this.layers.cone = [];
		this.profiles = [];
		
		//Add KNMI layers
		var knmi1 = new OpenLayers.Layer.WMS("KNMI stations",
                 "http://smoke-plume.argoss.nl/geoserver/wms",
                 {
                 	 layers: "knmi:vw_knmi_netherlands_windinfo,knmi:vw_knmi_netherlands_stations",
                 	 transparent: true
                 }//TODO: want to disable the legend
                 ,{metadata:{legendURL: "foo"}}
                 );
		app.mapPanel.map.addLayer(knmi1);
		//Add source for processid
		var source = app.addLayerSource({
            config: {
				url: OpenLayers.ProxyHost + escape("http://smoke-plume.argoss.nl/geoserver/"+processid+"/wms?request=getCapabilities"),
				ptype: "gxp_wmssource",
				title: processid,
				version: "1.1.1"
            }
        });
        source.createStore();
        
        
        source.store.reload({callback: function(records, operation, success){
        		var chartDrawn = false;
        		//Prepare layers and store layernames
        		for (i=0;i<records.length;i++){
        			var name = records[i].data.name;
					var record = source.createLayerRecord({
						name: name,
						source: "rookpluim",
						group: "smokeplume",
						opacity: 1,
						cached: false,
						visibility: false,
						//title: "Pluim om:" + name.split("_")[1]
						title: name
					});
					app.mapPanel.layers.add(record);
					if (name.match("grid"))
						self.layers.grid = name;
					if (name.match("_cv"))
						self.layers.vector.push(name);
					if (name.match("_cr"))
						self.layers.raster.push(name);
					if (name.match("_wv"))
						self.layers.wind.push(name);
					if (name.match("_cspl"))
						self.layers.cone.push(name);
					if (name.match("_csshp")){
						self.layers.profiel.push(name);
						//Pushing all profile data into array for quick use 
						var url = OpenLayers.ProxyHost + escape("http://smoke-plume.argoss.nl/geoserver/"+processid+"/ows?service=WFS&version=1.0.0&request=GetFeature&typeName="+self.processid+":"+name+"&maxFeatures=10000&outputFormat=json");
						//WARN: in future version of d3 this will be:d3.json(url, function(error, data){
						
						d3.json(url, function(result){
							//move into value arrays
							var conc1, cnc2, conc3 = null;
							var data = [];
							data1 = [];
							data2 = [];
							data3 = [];
							result.features.forEach(function(d){
								if (d.properties.lineindex == 1){
									conc1 = d.properties.conc;
									data1.push([d.properties.x, d.properties.z]);
								}
								if (d.properties.lineindex == 2){
									conc2 = d.properties.conc;
									data2.push([d.properties.x, d.properties.z]);
								}
								if (d.properties.lineindex == 3){
									conc3 = d.properties.conc;
									data3.push([d.properties.x, d.properties.z]);
								}
							});
							
							line1 = {"key":"VRW="+conc1+" (mg/m3)", color: "#ffff00","values": data1 };
							line2 = {"key":"AGW="+conc2+" (mg/m3)", color: "#ff9933","values": data2 };
							line3 = {"key":"LBW="+conc3+" (mg/m3)", color: "#ff3300","values": data3 };
							data.push(line1);
							data.push(line2);
							if (line3.values.length > 0) //TODO: more elegant check for data availability
								data.push(line3);
							self.profiles.push(data);
							if (!chartDrawn){
								//Draw first profiel
								self.chart = self.firstDraw(self.profiles[0]);
								chartDrawn = true;
							}
						});
					}
				}
				
				
				//Zoom to layer
				tmp = record.layer;
				var l = record.data.layer;
				var e = l.getMaxExtent();
				app.mapPanel.map.zoomToExtent(e);
				//Set play options
				var slider = self.weergaveWindow.getComponent('afspeelform').getComponent('stepslider'); 
        		slider.setMaxValue(self.layers.vector.length -1); //-1 because 0 is first layer
        	}
        });
		
		/***
			Handle smoke-plume results
		***/
		
		this.stop = function(){
			this.counter = 0;
			clearInterval(this.playinterval);
			this.showStep(this.counter);
		}
		
		this.pause = function(){
			//no need to reset counter
			clearInterval(this.playinterval);
		}
		
		this.forward = function(){
			this.counter++;
			this.showStep(this.counter);
		}
		
		this.backward = function(){
			this.counter--;
			this.showStep(this.counter);
		}
		
		this.toEnd = function(){
			this.counter = self.layers.vector.length;
			this.showStep(this.counter);
		}
		
		
		
		this.redraw = function(){
			this.showStep(this.counter);
		}
		this.showStep = function(step) {
			//Get slider
			var slider = self.weergaveWindow.getComponent('afspeelform').getComponent('stepslider');
			var min = 0;
			var range = this.range;
			//if (step - range > 0)
			//	min = step - range;
			
			//Set layers inside min/max visible
			for (var i=min;i<=step;i++){
				//Only do that for vector layer
				var name = self.layers.vector[i];
				var arr = app.mapPanel.map.getLayersByName(name);
				arr[0].setVisibility(self.visibleLayers['vector']);
				//arr[0].setOpacity(1-((step-i)/range));
				if (i == step)
					arr[0].setOpacity(1);
				else
					arr[0].setOpacity(0.3);
			}
			
			//Rest of layers only shown at T max step
			var name = self.layers.raster[step];
			var arr = app.mapPanel.map.getLayersByName(name);
			arr[0].setVisibility(self.visibleLayers['raster']);
			
			var name = self.layers.wind[step];
			var arr = app.mapPanel.map.getLayersByName(name);
			arr[0].setVisibility(self.visibleLayers['wind']);
			
			var name = self.layers.profiel[step];
			var arr = app.mapPanel.map.getLayersByName(name);
			arr[0].setVisibility(self.visibleLayers['profiel']);
			
			var name = self.layers.cone[step];
			var arr = app.mapPanel.map.getLayersByName(name);
			arr[0].setVisibility(self.visibleLayers['cone']);
						
			//Show time
			var time = name.split("_")[1].split("-");
			var hr =  time[0];
			var minutes = time[1];
			var sec = time[2];
			var timestring = time[0] + ":" + time[1];
			this.weergaveWindow.getComponent('afspeelform').getComponent('playtime').setValue(timestring);
			
			
			//Update slider
			//slider.setValue(1,step);
			//slider.setValue(0,min);
			slider.setValue(step);
			
			//Update chart
			self.updateChart(self.profiles[step]);

			//Set layers outside min/max invisible
			for (var i=0;i<self.layers.vector.length;i++){
				if (i < min || i > step){ //vector outside range
					var name = self.layers.vector[i];
					var arr = app.mapPanel.map.getLayersByName(name);
					arr[0].setVisibility(false);
				}
				if (i != step){ //rest of layers outside step
					var name = self.layers.raster[i];
					var arr = app.mapPanel.map.getLayersByName(name);
					arr[0].setVisibility(false);
					
					var name = self.layers.wind[i];
					var arr = app.mapPanel.map.getLayersByName(name);
					arr[0].setVisibility(false);
					
					var name = self.layers.profiel[i];
					var arr = app.mapPanel.map.getLayersByName(name);
					arr[0].setVisibility(false);
					
					var name = self.layers.cone[i];
					var arr = app.mapPanel.map.getLayersByName(name);
					arr[0].setVisibility(false);
				}
			}
		};
		
		this.counter = 0;
		this.range = 0;
		this._playstep = function(){
			//TODO: do this also for other layer types (object for layertype?)
				if (self.counter > self.layers.vector.length -1) //-1 because first layer is at 0
					self.counter = 0;
				self.counter++;
				self.showStep(self.counter);
		}
		this.play  = function(){
			this.playinterval = window.setInterval(this._playstep,2000);
		}
		
		
		
    
	
		
		Ext.Ajax.request({
			url:OpenLayers.ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getprocessinfo&datainputs=[processid='+processid+']'),
			headers: { Authorization : auth },
			scope: this,
			success: this.processParams //continue with running status
		});
		
		
	} //End of rookpluimresults
	
/****
	Simulaties store
*****/
var simulatiesIdReader = new Ext.data.ArrayReader(
	{id:'processid'}, 
	[
        'processid',
        'title'
    ]);
var simulatiesStore = new Ext.data.Store({                                      
    reader: simulatiesIdReader,
    sortInfo: { field: "processid", direction: "DESC" },
});
var cbxSelModel = new Ext.grid.CheckboxSelectionModel({
        checkOnly: false,
        singleSelect: true,
        injectCheckbox: false,
        sortable: false,
        dataIndex: 'visible',
        width: 20,
        listeners: {
            selectionchange: function(selectionModel, rowIndex, record) {
            	var selectedRows = selectionModel.getSelections();
            	if( selectedRows.length > 0){
            		//console.log('Success! ' + selectedRows[0].data.processid[0] );
            		var processid = selectedRows[0].data.processid[0];
					for (var i=0;i<modelresults.length;i++)
					{
						if (modelresults[i].processid == processid){
							modelresults[i].weergaveWindow.show();
							
						}
					}
            	}
            },
            scope: this
        }
    });

var simulatiesGrid = new Ext.grid.GridPanel({
		store: simulatiesStore,
		selModel: cbxSelModel,
		height: 400,
		columns: [
			cbxSelModel,
			{id: 'title', header: 'Name', width: 80, sortable: true, dataIndex: 'title'},
			/*{
			xtype: 'actioncolumn',
			width: 50,
			items: [{
				icon: '/rookpluim/images/icons/silk/icons/control_play.png',  // Use a URL in the icon config
				tooltip: 'Play',
				handler: function(grid, rowIndex, colIndex) {
					var rec = processStore.getAt(rowIndex);
					var processid = rec.get('processid');
					for (var i=0;i<modelresults.length;i++)
					{
						if (modelresults[i].processid == processid){
							modelresults[i].play();
						}
					}
				}
			},{
				icon: '/rookpluim/images/icons/silk/icons/control_pause.png',  // Use a URL in the icon config
				tooltip: 'Pause',
				handler: function(grid, rowIndex, colIndex) {
					var rec = processStore.getAt(rowIndex);
					var processid = rec.get('processid');
					for (var i=0;i<modelresults.length;i++)
					{
						if (modelresults[i].processid == processid){
							modelresults[i].pause();
						}
					}
				}
			}]
		}*/]
});
/******
	Rookpluim runs store
*****/

var modelresults = [];

var ProcessIdReader = new Ext.data.ArrayReader(
	{id:'processid'}, 
	[
        'processid',
        'title',
        {name: 'archive', type: 'bool'}
    ]);

var processStore = new Ext.data.Store({                                      
    reader: ProcessIdReader,
    sortInfo: { field: "processid", direction: "DESC" },
    
});


var processColModel = new Ext.grid.ColumnModel({
	defaults: {
		width: 80,
		sortable: true
	},
	columns: [
		{id: 'title', header: 'Name', width: 80, sortable: true, dataIndex: 'title'},
		{id: 'processid', header: 'Processid', width: 40, sortable: true, dataIndex: 'processid'},
		//{id: 'archive', header: 'Archive', width: 5, sortable: true, dataIndex: 'archive'},
	]
}); 

var processGrid = new Ext.grid.GridPanel({
		store: processStore,
		//title: "Processes",
		colModel: processColModel,
		height: 400,
		width: 250,
		bbar: [{
			text: 'OK',
			handler: function(){
				var rec = processGrid.getSelectionModel().getSelected();
				var newdata = {title: rec.get('title'), processid: rec.get('processid')};
				var rec = new simulatiesStore.recordType(newdata);
				simulatiesStore.insert(0,rec);
				var processid = rec.get('processid');
				for (var i=0;i<modelresults.length;i++)
				{
					modelresults[i].parampanel.hide();//hide info panel
					if (modelresults[i].processid == processid) //destroy if exists
						modelresults.splice(i,1);
				}
				//create new modelresults
				modelresults.push(new rookpluimresults(processid));
			}
		},{
			text: 'Annuleren',
			handler: function(){
				beheerWindow.hide();
			}
		}]
});


var ProcessIdData = [[]];
var userinfoReady = function(response) {
		var xml;
		var node;
		var dq = Ext.DomQuery;
		//XML with namespaces doesn't work in EXT, so we first remove the namespaces.
		//The replace function is now only replacing 'wps' and 'ows' namespaces
		//var xml = response.responseXML;
		var string = response.responseText.replace(/wps:/gi,"");
		string = string.replace(/ows:/gi,"");
		xml = StringtoXML(string);
		node = dq.selectNode('ExecuteResponse', xml);
		var nodeException = dq.selectNode('Exception',xml);
		if (nodeException != null) //error, show a message
		{
			Ext.MessageBox.show({
					title: "Error!",
					msg: nodeException.textContent,
					width: 300
			});
			//Ext.getCmp('rookpluimpanel1').enable();
			return;
		}
		
		var url = node.getAttribute("statusLocation");
		var nodeSucces = dq.selectNode('ProcessSucceeded',xml);
		var nodeAccept = dq.selectNode('ProcessAccepted',xml);
		var nodeStart = dq.selectNode('ProcessStarted',xml);
		
		//var nodeProcessid = dq.selectNode('Output:has(Identifier:nodeValue(processid)) > Data > LiteralData', xml);
		//var processid = nodeProcessid.textContent;
		
		if (nodeSucces != null) //we're done
		{
			var nodeProcesslist = dq.selectNode('Output:has(Identifier:nodeValue(processid)) > Data > LiteralData', xml);
			var nodeTitlelist = dq.selectNode('Output:has(Identifier:nodeValue(titlecase)) > Data > LiteralData', xml);
			var nodeArchivelist = dq.selectNode('Output:has(Identifier:nodeValue(archiveid)) > Data > LiteralData', xml);
			var processlist = nodeProcesslist.textContent;
			var titlelist = nodeTitlelist.textContent;
			var archivelist = nodeArchivelist.textContent;
			var list = processlist.split(",");
			var titlelist = titlelist.split(",");
			var archivelist = archivelist.split(",");
			var obj = Ext.getCmp('rookpluimpanel2');
			ProcessIdData = [];
			for (i=0;i<list.length;i++){
				n = list[i];
				title = titlelist[i];
				archive = archivelist[i];
				if (archive == 0 || archive == 2)
				{
					ProcessIdData.push([]);
					t = ProcessIdData.length -1;
					ProcessIdData[t] = [];
					ProcessIdData[t].push([n]);
					ProcessIdData[t].push([title]);
					ProcessIdData[t].push([archive]);
				}
			}
			//Ext.getCmp('rookpluimpanel1').enable();
			processStore.loadData(ProcessIdData);
		}
		else //we're not done, stay in the loop
		{
			if (nodeAccept != null) //first time accept
			{
				percentage = 0;
				status = nodeAccept.textContent;
				//Show an initial message box
				Ext.getCmp('processbar').updateProgress(0.1, "Server is processing", 1);
			}
			else if (nodeStart != null) //started and running
			{
				//Ext.MessageBox.hide();
				percentage = parseFloat(nodeStart.getAttribute("percentCompleted"));
				status = nodeStart.textContent;
				Ext.getCmp('processbar').updateProgress(percentage/100, status, 1);
			}
			else //this shouldn't happen
			{
				Ext.MessageBox.hide();
				alert('<b>Error in WPS connection</b> \n ' + string);
				return; 
			}
			//Ext.MessageBox.updateProgress(percentage/100,status + ' '+ percentage);
			var makeRequest = function() {
				Ext.Ajax.request({
					//TODO
					url: OpenLayers.ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getuserinfo&datainputs=[userid='+currentUser+']'),
					headers: { Authorization : auth },
					success: userinfoReady
				});
			}
			var t=setTimeout(makeRequest,3000); //Loop every 3 secs
		}
}