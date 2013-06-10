/**************
	Contains all actions that can be attached to a button of menu-item.
***************/

var actions = new Array();

actions["advanced_switch"] = new Ext.Button({
        enableToggle: true,
        pressed: true,
		text: "Geavanceerd",
		id: "advanced_switch",
		toggleHandler: function(){
			if (this.pressed) {
				this.setText("Gevanceerd");
				Ext.getCmp('fieldset_conversie').setVisible(true);
				Ext.getCmp('fieldset_nieuwbestaand').setVisible(true);
				Ext.getCmp('fieldset_terrein').setVisible(true);
			}
			else {
				this.setText("Geavanceerd");
				Ext.getCmp('fieldset_conversie').setVisible(false);
				Ext.getCmp('fieldset_nieuwbestaand').setVisible(false);
				Ext.getCmp('fieldset_terrein').setVisible(false);
			}
		}
		
});

actions["newfuelmodel"] = new Ext.Button({
		text: "Nieuw terrein",
		handler: function(){
			Ext.getCmp("landuse2fuel_btn").show();
			Ext.getCmp("terreinpanel1").show();
		}
});

actions["existingfuelmodel"] = new Ext.Button({
		text: "Kopie van bestaand",
		handler: function(){
			Ext.getCmp("landuse2fuel_btn").hide();
			Ext.getCmp("terreinpanel1").hide();
			fuelmodelWindow.show();
			processStore.reloadme();
		}
});

/** 
	edit landuse2fuel conversie tabel 
**/
actions["landuse2fuel"] = new Ext.Button({
		text: "Pas conversie aan",
		id: "landuse2fuel_btn",
		handler: function(){
			landuse2fuelWindow.show();	
		}
});



/** 
	edit windcharacteristics tabel 
**/
actions["windedit"] = new Ext.Button({
		text: "Weersomstandigheden",
		//xtype: 'button',
		width: 150,
		handler: function(){
			windWindow.show();
			windStore.loadData();
		}
});

/** 
	edit weathercharacteristics tabel 
**/
actions["weatheredit"] = new Ext.Button({
		text: "Weersomstandigheden",
		//xtype: 'button',
		width: 150,
		handler: function(){
			weathersettingsWindow.show();
			weatherStore.loadData();
			windStore.loadData();
		}
});

/***
	Open window with fueltypes
***/

actions["showFueltypes"] = new Ext.Button({
		text: "Scroll fueltypes",
		handler: function(){
			fueltypesWindow.show();
		}
});

/***
	genereer landscape file
***/
actions["makeLcp"] = new Ext.Button({
		text: "Opslaan",
		xtype: 'button',
		tooltip: "Create landscape file on the base of currently selected region",	
		handler: function(){
			/*
			Ext.MessageBox.show({
					msg: 'Model is being initialized (this may take a while)',
					width: 300,
					wait: true,
					waitConfig: {interval: 200}
			});
			*/
			var terreinid = Ext.getCmp("terrein_id").getValue();
			var landscapename = Ext.getCmp("fuelmodel_name").getValue();
			var userid = '0';
			if (terreinid > 0) {
				Ext.Ajax.request({
						//url: '../wildfire/pywps/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=makeLcp&datainputs=[terreinid='+terreinid+';terreinname='+terreinname+']',
						url: '/geoserver/ows?service=WPS&request=execute&version=1.0.0&identifier=py:wildfire_makelcp&datainputs=userid='+userid+';terreinid='+terreinid+';landscapename='+landscapename+';&RawDataOutput=string&mimeType=application/json',
						success: wpsCallback
				});
			}
			else
				alert('Geen terrein geselecteerd of geen geldig terrein id opgegeven.');
			
		}
});

/***
	Download shapefile model output
***/
/* Obsolete?
actions["export_modelOutput"] = new Ext.Button({
		text: "Download",
		handler: function(){
			Ext.MessageBox.show({
					msg: '<a target="_blank" href="http://192.168.56.101/geoserver/farsite/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=farsite:bergen2_perim&maxFeatures=1000&outputFormat=SHAPE-ZIP">Klik here to download the shapefile</a>',
					width: 300,
					title: 'Export shapefile'
			});
		}
});
*/
var wpsCallback = function(response) {
	Ext.MessageBox.hide();
	Ext.getCmp("wildfirepanel").disable();
	var json;
	try{
		json = JSON.parse(response.responseText);
	}
	catch(err){
		alert('<b>Error in WPS connection</b> \n ' + response.responseText);
		Ext.getCmp("wildfirepanel").enable();
		return; 
	}
	var status = json.status;
	var percentage = json.percentage;
	var processid = json.runid;
	var modelname = json.modelname;
	
	var activerunid = processid;
	
	if (Ext.getCmp('progressbar') == null) {
		form = Ext.getCmp('progresspanel');
		form.add({
			xtype: 'progress',
			fieldLabel: processid,
			id: 'progressbar'
		});
		form.doLayout();
	}
	Ext.getCmp('progressbar').updateProgress(percentage/100, status, 1);
	if (percentage < 100) {
		var makeRequest = function(){
			Ext.Ajax.request({
					url:'/geoserver/ows?service=WPS&request=execute&version=1.0.0&identifier=py:checkModelStatus&datainputs=runid='+activerunid+';&RawDataOutput=string=mimeType="application/json"',
					success: wpsCallback //continue with running status
			});
		}
		var t=setTimeout(makeRequest,3000); //Loop every 3 secs
	}
	else if (percentage == 100) { //Were done!!
		//Ext.Ajax.request({
		//			url:'./php/reload_geoserver.php',
		//});
		Ext.getCmp("wildfirepanel").enable();
		
		if (modelname == 'makeSubset') {
			//Adding terrein layer 
			//TODO: not right place here, move to seperate function
			//Copied partly from https://github.com/opengeo/gxp/blob/master/src/script/plugins/AddLayers.js
			var source = app.layerSources["spatial"];
			source.store.reload({callback:
				function(records,operation, success){
					var record = source.createLayerRecord({
						name: "model_wildfire:terrein_"+processid,
						source: "spatial",
						group: "wildfire",
						opacity: 1,
						cached: false,
						title: "Terrein " + processid
					});
					app.mapPanel.layers.add(record);
					app.selectLayer(record);
					Ext.getCmp("terrein_id").setValue(processid);
				}
				
			});
			
		}
		else if (modelname == 'makeLcp') {
			Ext.getCmp("fuelmodel_id").setValue(processid);
		}
		else if (modelname == 'farsiteRun') {
			//Adding terrein layer 
			//TODO: not right place here, move to seperate function
			//Copied partly from https://github.com/opengeo/gxp/blob/master/src/script/plugins/AddLayers.js
			var source = app.layerSources["spatial"];
			source.store.reload({callback:
				function(records,operation, success){
					var record = source.createLayerRecord({
						name: "model_wildfire:result_"+processid,
						source: "spatial",
						group: "wildfire"
						//title: "Results " + processid
					});
					app.mapPanel.layers.add(record);
					Ext.MessageBox.hide();
				}
			});
		}
	}else //this shouldn't happen!
	{
		alert('<b>Error in WPS connection</b> \n ' + response.responseText);
		Ext.getCmp("wildfirepanel").enable();
		return; 
	}
	
}

var StringtoXML = function(text){
	if (window.ActiveXObject){
	  var doc=new ActiveXObject('Microsoft.XMLDOM');
	  doc.async='false';
	  doc.loadXML(text);
	} else {
	  var parser=new DOMParser();
	  var doc=parser.parseFromString(text,'text/xml');
	}
	return doc;
}
//WILL BE REPLACED BY wpsCallback ^^
var wpsRunning = function(response) {
	var xml;
	var node;
	Ext.MessageBox.hide();
	Ext.getCmp("wildfirepanel").disable();
	var dq = Ext.DomQuery;
	//XML with namespaces doesn't work in EXT, so we first remove the namespaces.
	//The replace function is now only replacing 'wps' and 'ows' namespaces
	//var xml = response.responseXML;
	var string = response.responseText.replace(/wps:/gi,"");
	string = string.replace(/ows:/gi,"");
	xml = StringtoXML(string);
	node = dq.selectNode('ExecuteResponse', xml);
	//Check for exceptions:
	var nodeException = dq.selectNode('Exception',xml);
	if (nodeException != null) //error, show a message
	{
		Ext.MessageBox.show({
				title: "Error!",
				msg: nodeException.textContent,
				wait: 300,
				width: 300
		});
		Ext.getCmp("wildfirepanel").enable();
		return;
	}
	var nodeSucces = dq.selectNode('ProcessSucceeded',xml);
	var nodeProcessid = dq.selectNode('Output:has(Identifier:nodeValue(runid)) > Data > LiteralData', xml);
	var processid = nodeProcessid.textContent;
	var nodeStatus = dq.selectNode('Output:has(Identifier:nodeValue(status)) > Data > LiteralData', xml);
	var status = nodeStatus.textContent;
	var nodePercentage = dq.selectNode('Output:has(Identifier:nodeValue(percentage)) > Data > LiteralData', xml);
	var percentage = nodePercentage.textContent;
	var nodeModelname = dq.selectNode('Output:has(Identifier:nodeValue(modelname)) > Data > LiteralData', xml);
	if (nodeModelname)
		var modelname = nodeModelname.textContent;
	else 
		var modelname = "";
	
	var activerunid = processid;
	
	if (Ext.getCmp('progressbar') == null) {
		form = Ext.getCmp('progresspanel');
		form.add({
			xtype: 'progress',
			fieldLabel: processid,
			id: 'progressbar'
		});
		form.doLayout();
	}
	Ext.getCmp('progressbar').updateProgress(percentage/100, status, 1);
	if (percentage < 100) {
		var makeRequest = function(){
			Ext.Ajax.request({
					url:'../wildfire/pywps/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=checkModelStatus&datainputs=[runid='+activerunid+';]',
					success: wpsRunning //continue with running status
			});
		}
		var t=setTimeout(makeRequest,3000); //Loop every 3 secs
	}
	else if (percentage == 100) { //Were done!!
		//Ext.Ajax.request({
		//			url:'./php/reload_geoserver.php',
		//});
		Ext.getCmp("wildfirepanel").enable();
		
		if (modelname == 'makeSubset') {
			//Adding terrein layer 
			//TODO: not right place here, move to seperate function
			//Copied partly from https://github.com/opengeo/gxp/blob/master/src/script/plugins/AddLayers.js
			var source = app.layerSources["spatial"];
			source.store.reload();
			//TODO: this needs to become a listener for the store reload done instead of timeout
			setTimeout(function(){
				var record = source.createLayerRecord({
					name: "model_wildfire:terrein_"+processid,
					source: "spatial",
					group: "wildfire",
					opacity: 0.3,
					cached: false,
					title: "Terrein " + processid
				});
				app.mapPanel.layers.add(record)
			},2000);
			Ext.getCmp("terrein_id").setValue(processid);
		}
		else if (modelname == 'makeLcp') {
			Ext.getCmp("fuelmodel_id").setValue(processid);
		}
		else if (modelname == 'farsiteRun') {
			//Dirty trick to get a refresh of the layer
			//app.mapPanel.map.getLayersByName('Model output')[0].mergeNewParams('boe:' + new Date().getTime());
			//Adding terrein layer 
			//TODO: not right place here, move to seperate function
			//Copied partly from https://github.com/opengeo/gxp/blob/master/src/script/plugins/AddLayers.js
			var source = app.layerSources["spatial"];
			source.store.reload();
			//TODO: this needs to become a listener for the store reload done instead of timeout
			setTimeout(function(){
				var record = source.createLayerRecord({
					name: "model_wildfire:bergen"+processid+"_perim",
					source: "spatial",
					group: "wildfire",
					title: "Results " + processid
				});
				app.mapPanel.layers.add(record);
			},2000);
			Ext.MessageBox.hide();
		}
	}else //this shouldn't happen!
	{
		alert('<b>Error in WPS connection</b> \n ' + string);
		Ext.getCmp("wildfirepanel").enable();
		return; 
	}
}


/**
	Get the terreinmodels
**/
var ProcessIdData = [[]];
var terreinReady = function(response) {
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
		var nodeException = dq.selectNode('ExceptionText',xml);
		if (nodeException != null) //error, show a message
		{
			Ext.MessageBox.show({
					title: "Error!",
					msg: nodeException.textContent,
					width: 300
			});
			Ext.getCmp('rookpluimpanel1').enable();
			return;
		}

		var nodeSucces = dq.selectNode('ProcessSucceeded',xml);
		
		if (nodeSucces != null) //we're done
		{
			var nodeProcesslist = dq.selectNode('Output:has(Identifier:nodeValue(runids)) > Data > LiteralData', xml);
			var nodeTitlelist = dq.selectNode('Output:has(Identifier:nodeValue(terreinnames)) > Data > LiteralData', xml);
			
			var processlist = nodeProcesslist.textContent;
			var titlelist = nodeTitlelist.textContent;
			
			var list = processlist.split(",");
			var titlelist = titlelist.split(",");
			
			ProcessIdData = [];
			for (i=0;i<list.length;i++){
				n = list[i];
				title = titlelist[i];
				ProcessIdData.push([]);
				t = ProcessIdData.length -1;
				ProcessIdData[t] = [];
				ProcessIdData[t].push([n]);
				ProcessIdData[t].push([title]);
			}
			processStore.loadData(ProcessIdData);
		}
		else //this shouldn't happen
		{
			Ext.MessageBox.hide();
			alert('<b>Error in WPS connection</b> \n ' + string);
			return;
		}

}
