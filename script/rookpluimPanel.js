var errorcodes = [
	""
	,"De grenswaarden temperatuur buiten domein."
	,"De grenswaarden hoogte brandhaard buiten domein."
	,"De grenswaarden oppervlakte buiten domein."
	,"De grenswaarden emissie buiten domein."
	,"De grenswaarden verhouding oppervlakte/emissie buiten domiein."
	,"De x-positie ligt buiten domein van het grid."
	,"De y-positie ligt buiten domein van het grid."
	,"Het coördinatensysteem is niet epsg:23021 UTM31N"
	,"Format begintijd niet correct"
	,"Format eindtijd niet correct"
	,"Begintijd ligt te ver terug, geen meteodata"
	,"Eindtijd ligt te ver weg, geen meteodata."
	,"De begintijd ligt niet voor de eindtijd."
	,"Tijd tussen begin en eindtijd is kleiner dan 3600 sec."
	,"De titlecase komt al voor, dit is niet toegestaan."
	,"Type gaslek niet correct"
	,"Diameter gaslek niet correct."
	,"Verhouding emissie/diameter niet correct."
	,"Typeoffire niet correct ‘area; of ‘leak’ is toegestaan"
	,"Aantal waarden voor temperatuur niet gelijk aan tijden die gedefinieerd zijn bij de variabele timesteps"
	,"Aantal waarden voor emissie niet gelijk aan tijden die gedefinieerd zijn bij de variabele timesteps"
	,"Tijden voor variabele temperatuur en emissie liggen niet tussen begintijd en eindtijd. Tijden worden gedefinieerd in uren vanaf begintijd."
	,"Als variabele emissie en temperatuur wordt gevraagd en eerste tijdstip in niet gelijk aan 0.0 dan foutmelding"
	,"Gridsize niet correct >=50 en =<250 met stappen van 50 meter"
];

var visibleLayers = [];
visibleLayers['vector'] = true;
visibleLayers['grid'] = true;
var activeRuns = [];

//Generic pywps parser 
function pywpsParser(response){
	var xml;
	var dq = Ext.DomQuery;
	//XML with namespaces doesn't work in EXT, so we first remove the namespaces.
	//The replace function is now only replacing 'wps' and 'ows' namespaces
	//var xml = response.responseXML;
	var string = response.responseText.replace(/wps:/gi,"");
	string = string.replace(/ows:/gi,"");
	xml = StringtoXML(string);
	var node;
	node = dq.selectNode('ExecuteResponse', xml);
	var nodeException = dq.selectNode('Exception',xml);
	if (nodeException != null) //error, show a message
	{
		Ext.MessageBox.show({
				title: "Error!",
				msg: nodeException.textContent,
				wait: 300,
				width: 300
		});
		return;
	}
	
	this.getNode = function(key){
		var node = dq.selectNode('Output:has(Identifier:nodeValue('+key+')) > Data > LiteralData', xml);
		return node;
	}
	return this;
	
}


function smokeRun(response) {
	this.startTime = new Date();
	this.firstStatus = true;
	this.prevStatus;
	this.resonse = response;
	this.processid;
	this.statusObj = {};
	var self = this;
	//First time start, run is presumably accepted
	this.rookpluimStarted = function(response) {
		var nodes = new pywpsParser(response);
		var nodeProcessid = nodes.getNode('processid');
		var processid = nodeProcessid.textContent;
		if (processid != null) //we're done
		{
			Ext.Ajax.request({
					url:OpenLayers.ProxyHost+escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getstatusinfo&datainputs=[processid='+processid+']'),
					headers: { Authorization : auth },
					success: self.rookpluimRunning //continue with running status
				});
		}
		else console.warn('No processid returned by server');
	}
	//Now it is running, keep checking for the status
	this.rookpluimRunning = function(response) {
		var nodes = new pywpsParser(response);
		var nodeProcessid = nodes.getNode('processid');
		var processid = nodeProcessid.textContent;
		var nodeStatus = nodes.getNode('status');
		var nodeDuration = nodes.getNode('statusduration');
		var nodeOrder = nodes.getNode('statusorder');
		
		if (nodeStatus.textContent == 'successfully') //we're done
		{
			var pbar = Ext.getCmp('successfully');
			pbar.updateProgress(1, "Done", 1);
			Ext.Ajax.request({
				url:OpenLayers.ProxyHost+escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getmodelresults&datainputs=[processid='+processid+']'),
				headers: { Authorization : auth },
				scope: this,
				success: self.rookpluimReady
			});
		}
		else //we're not done, stay in the loop
		{
			if (self.firstStatus) //first time status overview, build progressbars
			{
				self.firstStatus = false;
				
				//Create panel with progressbars
				var p = Ext.getCmp('pbarpanel');
				p.removeAll();
				var durationArr = nodeDuration.textContent.split(",");
				var orderArr = nodeOrder.textContent.split(",");
				for (var i = 0; i<durationArr.length;i++){
					self.statusObj[orderArr[i]] = durationArr[i];
					item = new Ext.ProgressBar({
							id: orderArr[i],
							text: orderArr[i] + " 0/" + durationArr[i]
					})
					p.items.add(item);
				}
				p.doLayout();
			}
			
			var status = nodeStatus.textContent;
			if (self.prevStatus && status != self.prevStatus){ //status update, timer reset
				self.startTime = new Date();
				var pbar = Ext.getCmp(self.prevStatus);
				pbar.updateProgress(1);
			}
			var pbar = Ext.getCmp(status);
			var seconds = (new Date() - self.startTime)/1000;
			var percentage = seconds / self.statusObj[status];
			pbar.updateProgress(percentage, status + " " + parseInt(seconds) + "/" + self.statusObj[status] , 1);
			self.prevStatus = nodeStatus.textContent;
			var makeRequest = function() {
				Ext.Ajax.request({
					url:OpenLayers.ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getstatusinfo&datainputs=[processid='+processid+']'),
					headers: { Authorization : auth },
					success: self.rookpluimRunning
				});
			}
			var t=setTimeout(makeRequest,3000); //Loop every 3 secs
		}
			
	}
	//Server is ready, we can update 
	this.rookpluimReady = function(response) {
		var nodes = new pywpsParser(response);
		var nodeProcessid = nodes.getNode('processid');
		var processid = nodeProcessid.textContent;	
		if (processid) //we're done
		{
			Ext.Ajax.request({
					//TODO
					url: OpenLayers.ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getuserinfo&datainputs=[userid='+currentUser+']'),
					headers: { Authorization : auth },
					success: function(response){
						userinfoReady(response);
						modelresults.push(new rookpluimresults(processid, title));
					}
				});
		}
		else
		{
			console.warn('No processid returned from server');
		}
	}
	//fireoff the process of checking the model status upon creation of the object 
	this.rookpluimStarted(response);
}

function processValidation(response){
	
	var node;
	var xml;	
	var dq = Ext.DomQuery;
	var string = response.responseText.replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
	string = string.replace(/wps:/gi,"").replace(/ows:/gi,"");
	xml = StringtoXML(string);
	node = dq.selectNode('ExecuteResponse', xml);
	var url = node.getAttribute("statusLocation");
	var nodeSucces = dq.selectNode('ProcessSucceeded',xml);
	var nodeFail = dq.selectNode('ProcessFailed',xml);
	var nodeAccept = dq.selectNode('ProcessAccepted',xml);
	var nodeStart = dq.selectNode('ProcessStarted',xml);
	var nodeProcessid = dq.selectNode('Output:has(Identifier:nodeValue(processid)) > Data > LiteralData', xml);
	//var processid = nodeProcessid.textContent;
	
	if (nodeFail != null) // appears something wrong
	{
		Ext.getCmp('smokestart_btn').disable();
		x = xml.getElementsByTagName("ExceptionOutput");
		for (i = 0; i < x.length; i++) {
			var identifier = x[i].getElementsByTagName("Identifier")[0].textContent;
			var exceptiondata = x[i].getElementsByTagName("ExceptionData")[0];
			var errorstring  = "";
			var errorcode = exceptiondata.attributes.error.value;
			var value = exceptiondata.attributes.value.value;
			errorstring = errorcodes[parseInt(errorcode)];
			if (exceptiondata.attributes.minimum){
				var min = exceptiondata.attributes.minimum.value;
				var max = exceptiondata.attributes.maximum.value;
				errorstring = errorstring + " Min: " + min + ",Max: " + max;
			}
			if (Ext.getCmp(identifier))
				Ext.getCmp(identifier).markInvalid(errorstring);
			//console.warn('Error: ' + identifier + ' gives ' + errorstring);
		}
	}
	if (nodeSucces != null) //we're done
	{
		Ext.getCmp('smokestart_btn').enable();
	}
	  
}
 


function fireSmoke(validateonly){
	var titlecase=Ext.getCmp('titlecase').getValue();
	//TODO: at the moment fixed at 32631
	//epsg=Ext.getCmp('epsg').getValue();
	var epsg=32631;
	var begdate=Ext.getCmp('begdatum').getValue();
	var begYear=begdate.getFullYear();
	var begMonth=begdate.getMonth()+1;
	var begDay=begdate.getDate();
	var begtime=Ext.getCmp('begtime').getValue();
	var enddate=Ext.getCmp('enddatum').getValue();
	var endYear=enddate.getFullYear();
	var endMonth=enddate.getMonth()+1;
	var endDay=enddate.getDate();
	var endtime=Ext.getCmp('endtime').getValue();
	var x = Ext.getCmp('xcrd').getValue();
	var y = Ext.getCmp('ycrd').getValue();
	var point = new OpenLayers.Geometry.Point(x,y);
	var fromProjection = new OpenLayers.Projection("EPSG:28992");
	var toProjection = new OpenLayers.Projection("EPSG:32631");
	point.transform(fromProjection, toProjection);
	x = point.x / 1000;
	y = point.y /1000;
	begDate = ''+begYear+'-'+begMonth+'-'+begDay+'_'+begtime+':00';
	endDate = ''+endYear+'-'+endMonth+'-'+endDay+'_'+endtime+':00';
	var species=Ext.getCmp('species').getValue();
	var emission, temperature, timesteps;
	if (Ext.getCmp('constantemission').getValue())
	{
		emission=Ext.getCmp('emission').getValue();
		temperature=Ext.getCmp('temperature').getValue();
		timesteps = "0";
	}
	else
	{
		var d1 = [];
		var d2 = [];
		var d3 = [];
		jsonData = emissieStore.getRange();
		jsonData.forEach(function(d, i) {
			d1.push(d.data.hours);
			d2.push(d.data.temperatuur);
			d3.push(d.data.emissie);
		});
		timesteps = d1.toString();
		temperature = d2.toString();
		emission = d3.toString();
	}
	var surface=Ext.getCmp('surface').getValue();
	var stackheight=Ext.getCmp('stackheight').getValue();
	
	var typeoffire = Ext.getCmp('typeoffire').getValue();
	var typeofleak = 1; //TODO
	var gridsize = Ext.getCmp('gridsize').getValue();;
	
	//console.log('/rookpluim/argoss/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=startcalpuffv4&datainputs=[userid='+ currentUser + ';titlecase='+titlecase+';epsg='+epsg+';xcrd='+x+';ycrd='+y +';begtime='+begDate+';endtime='+endDate+';species='+species+';emission='+emission+';surface='+surface+';stackheight='+stackheight+';timesteps='+timesteps+';temperature='+temperature+';typeoffire='+typeoffire+';gridsize='+gridsize+';validateonly='+validateonly+']');
	if (validateonly) {
		Ext.Ajax.request({
		   url: OpenLayers.ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=startcalpuffv4&datainputs=[userid='+ currentUser + ';titlecase='+titlecase+';epsg='+epsg+';xcrd='+x+';ycrd='+y +';begtime='+begDate+';endtime='+endDate+';species='+species+';emission='+emission+';surface='+surface+';stackheight='+stackheight+';timesteps='+timesteps+';temperature='+temperature+';typeoffire='+typeoffire+';gridsize='+gridsize+';validateonly=yes;]'),
		   method: 'GET',
		   headers: { Authorization : auth },
		   success: processValidation
		});
	}
	else {
		Ext.Ajax.request({
		   url: OpenLayers.ProxyHost+escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=startcalpuffv4&datainputs=[userid='+ currentUser + ';titlecase='+titlecase+';epsg='+epsg+';xcrd='+x+';ycrd='+y +';begtime='+begDate+';endtime='+endDate+';species='+species+';emission='+emission+';surface='+surface+';stackheight='+stackheight+';timesteps='+timesteps+';temperature='+temperature+';typeoffire='+typeoffire+';gridsize='+gridsize+';]'),
		   method: 'GET',
		   headers: { Authorization : auth },
		   success: function(response){
		   	   	//Throwing process into object
		   	   	activeRuns.push(new smokeRun(response));
		   }
		});
	}
}


function fillForm(response){
	var node;
	var dq = Ext.DomQuery;
	//XML with namespaces doesn't work in EXT, so we first remove the namespaces.
	//The replace function is now only replacing 'wps' and 'ows' namespaces
	//var xml = response.responseXML;
	var string = response.responseText.replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
	string = string.replace(/wps:/gi,"").replace(/ows:/gi,"");
	var xml = StringtoXML(string);
	x = xml.getElementsByTagName("Output");
	var xcrd, ycrd;
	
	for (i = 0; i < x.length; i++) {
		var identifier = x[i].getElementsByTagName("Identifier")[0].textContent;
		var data = x[i].getElementsByTagName("LiteralData")[0].textContent;
		if (identifier == 'xcrd')
			var xcrd = data * 1000;
		else if (identifier == 'ycrd')
			var ycrd = data * 1000;
		else if (identifier == 'begtime'){ //Yuk, dit is wel lelijk....   
			var date = data.split("_")[0];
			var time = data.split("_")[1];
			var hours = time.split(":")[0];
			var mins = time.split(":")[1];
			var d = new Date(date);
			d.setHours(hours);
			d.setMinutes(mins);
			Ext.getCmp('begtime').setValue(d);
			Ext.getCmp('begdatum').setValue(d);
		}
		else if (identifier == 'endtime'){
			var date = data.split("_")[0];
			var time = data.split("_")[1];
			var hours = time.split(":")[0];
			var mins = time.split(":")[1];
			var d = new Date(date);
			d.setHours(hours);
			d.setMinutes(mins);
			Ext.getCmp('endtime').setValue(d);
			Ext.getCmp('enddatum').setValue(d);
		}
		else if (identifier == 'timesteps'){
			var timesteps = data.split(",");       
		}
		else if (identifier == 'temperature'){
			var temperature = data.split(",");       
		}
		else if (identifier == 'emission'){
			var emission = data.split(",");       
		}
	
		else if (Ext.getCmp(identifier))
		{
			Ext.getCmp(identifier).setValue(data);
		}
	}
	//Set the coordinates 
	var point = new OpenLayers.Geometry.Point(xcrd,ycrd);
	var fromProjection = new OpenLayers.Projection("EPSG:32631");
	var toProjection = new OpenLayers.Projection("EPSG:28992");
	point.transform(fromProjection, toProjection);
	Ext.getCmp('xcrd').setValue(point.x);
	Ext.getCmp('ycrd').setValue(point.y);
	//Fill emissiestore
	var emissiedata = {};
	emissiedata.total = timesteps.length;
	emissiedata.results = [];
	for (i = 0; i < timesteps.length; i++) {
		record = {"hours":timesteps[i],"temperatuur": temperature[i],"emissie":emission[i]};
		emissiedata.results.push(record);
	}
	emissieStore.loadData(emissiedata);
	updateChart();
}


/************************/
var emissieData = 
	{"total":"6",
	"results":[
		{"hours":0,"temperatuur":600,"emissie":2},
		{"hours":1,"temperatuur":550,"emissie":3},
		{"hours":2,"temperatuur":500,"emissie":2},
		{"hours":3,"temperatuur":500,"emissie":1},
		{"hours":4,"temperatuur":500,"emissie":1},
		{"hours":5,"temperatuur":450,"emissie":1}
	]};

var emissieStore = new Ext.data.Store({
		id: 'emissieStore',
		autoSave: false,
		sortInfo: { field: "hours", direction: "ASC" },
		reader: new Ext.data.JsonReader({
			// metadata configuration options:
			idProperty: 'id',
			root: 'results',
			totalProperty: 'total',
			messageProperty: 'message',
			succesProperty: 'success',
			fields:
			[
				{name: 'hours', type: 'float'},
				{name: 'temperatuur', type: 'int'},
				{name: 'emissie', type: 'float'},
			]}
		),
		listeners: {
			'update': function (store, records, options) {
				updateChart();
			}
		}
});
emissieStore.loadData(emissieData);
emissieStore.sortByFields([{'field':'hours','direction':'ASC'}]);

var emissieColumnModel = new Ext.grid.ColumnModel({
	 defaults: {
            sortable: false // columns are not sortable by default           
   },
   columns:	[
   	 {
			header: 'Tijd',
			dataIndex: 'hours',
			editable: true,
			//width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 3
			})
		},{
			header: 'Temp (0C)',
			dataIndex: 'temperatuur',
			editable: true,
			//width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 3
			})
		},{	
			header: 'Emissie (Kg/s)',
			dataIndex: 'emissie',
			editable: true,
			//width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 3
			})
		}
		]
});
var emissieGrid = new Ext.grid.EditorGridPanel({
		id: 'emissiegrid',
		title: 'Emissie komende uren',
		store: emissieStore,
		cm: emissieColumnModel,
		//height: 200,
		clicksToEdit:1,
		enableColLock:false,
		loadMask: true,
		frame: true,
		autoSizeColumns: true,
		autoSizeGrid: true,
		viewConfig: {
			forceFit: true
		},
		listeners: {
			'afteredit': function(){
				this.store.sort('hours','ASC');
			}
        },
		tbar: [
			{
			text: 'Record toevoegen',
            handler: function(){
                // access the Record constructor through the grid's store
                
                var newRec = emissieStore.recordType;
                var p = new newRec({
                		hours: "0",
                		temperatuur: "0",
                		emissie: "0"
                });
                emissieGrid.stopEditing();
                emissieStore.insert(0, p);
                emissieStore.save();
                emissieStore.reload();
                emissieGrid.startEditing(0, 0);
            }
		},{
			text: 'Records verwijderen',
			handler: function(){
				//delete records
				var selected = emissieGrid.getSelectionModel().getSelectedCell();

				Ext.MessageBox.confirm(
					'Bevestigen',
					'Zeker weten?',
					function(btn) {
						if (btn == 'yes') {
							var recordToDelete = emissieStore.getAt(selected[0]);
							emissieStore.remove(recordToDelete);
							emissieStore.save();
							emissieStore.reload();
						}
					}
				);
			}
		}]
});

/**** END OF STORES *****************/

/***** START OF BEHEERWINDOW *****/

var beheerWindow = new Ext.Window({
	title: 'Kies een simulatie',
	closable: true,
	closeAction: 'hide',
	items: [processGrid]
});



/**** END OF BEHEERWINDOW *******/


/*****START OF ModelPanel****/
var now = new Date();
var later = new Date();
later.setHours(later.getHours()+5);

var basisPanel = new Ext.form.FormPanel({
		title: 'Basis',
		id: 'basisPanel',
		labelWidth: 150,
		padding: '10px',
		autoScroll: true,
		defaults: {
			//style: 'margin: 5px;',
			msgTarget: 'under' 
		},
		items: [
			{
			fieldLabel: 'Simulatie',
			xtype: 'checkbox',
			id: 'useExisting',
			boxLabel: 'Gebruik oude invoergegevens',
			handler: function() { 
				if (this.checked)
					Ext.getCmp('existingRunsCombo').enable(); 
				else
					Ext.getCmp('existingRunsCombo').disable(); 
				}
		},{
			xtype: 'combo',
			id: 'existingRunsCombo',
			mode:           'local',
			value:          null,
			triggerAction:  'all',
			forceSelection: false,
			editable:       false,
			disabled: true,
			//fieldLabel:     'Title',
			name:           'existingRun',
			hiddenName:     'existingRun',
			displayField:   'title',
			valueField:     'processid',
			store:       processStore,
			listeners:{
				 scope: this,
				 'select': function(){
				 	 var processid = Ext.getCmp('existingRunsCombo').getValue();
				 	 Ext.Ajax.request({
						url:OpenLayers.ProxyHost+escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getprocessinfo&datainputs=[processid='+processid+']'),
						headers: { Authorization : auth },
						scope: this,
						success: fillForm //continue with running status
					});
				 }
			}
		},{
			fieldLabel: 'Naam',
			xtype: 'textfield',
			name: 'simulation_name',
			width: 100,
			align: 'right',
			value: 'test',
			id: 'titlecase',
			//style: 'padding: 0px;'
		},{
			xtype: 'compositefield',
			fieldLabel: 'Begintijd incident',
			id: 'begdate',
			items: [
			{
				xtype: 'datefield',
				id: 'begdatum',
				format: "j/n/Y",
				value: now
			},{
				xtype: 'timefield',
				id: 'begtime',
				format: "H:i",
				value: now
			}]
		},{
			fieldLabel: 'Eindtijd simulatie',
			xtype: 'compositefield',
			id: 'enddate',
			items: [{
				xtype: 'datefield',
				id: 'enddatum',
				format: "j/n/Y",
				value: later
			},{
				xtype: 'timefield',
				id: 'endtime',
				format: "H:i",
				value: later
			}]
		},{
			fieldLabel: 'Locatie',
			xtype: 'panel',
			layout: 'table',
			layoutConfig: {
				// The total column count must be specified here
				columns: 5
        	},
        	defaults: {
				// applied to each contained panel
				padding: '10px',
				style: 'margin: 5px;'
			},
			items: [
			{
				xtype: 'radio',
				checked: true,
				name: 'locationselection',
				boxLabel: 'Coordinaten (RD)'
				
			},{
				xtype: 'button',
				text: 'Selecteer op kaart',
				handler: function(){
					modelWindow.hide();
					OpenLayers.Control.PointLoc = OpenLayers.Class(OpenLayers.Control, {
						type: OpenLayers.Control.TYPE_TOOL,
						draw: function () {
							this.handler = new OpenLayers.Handler.Point( control, 
								{"done": this.process});
						},
						process: function (point) {
							modelWindow.show();
							var fromProjection = new OpenLayers.Projection("EPSG:900913");
							var toProjection = new OpenLayers.Projection("EPSG:32631");
							var toProjection = new OpenLayers.Projection("EPSG:28992");
							point.transform(fromProjection,toProjection);
							var x = point.x;
							var y = point.y;
							Ext.getCmp('xcrd').setValue(x);
							Ext.getCmp('ycrd').setValue(y);
							this.deactivate();
						},
						CLASS_NAME: "OpenLayers.Control.PointLoc"
					});
					var control = new OpenLayers.Control.PointLoc();
					app.mapPanel.map.addControl(control);
					control.activate();
				},
				colspan: 2
			},{
				xtype: 'numberfield',
				name: 'xcoord',
				width: 50,
				align: 'right',
				value: '155000',
				id: 'xcrd',
				emptyText: '00'   
			},{
				xtype: 'numberfield',
				name: 'ycoord',
				width: 50,
				align: 'right',
				value: '463000',
				id: 'ycrd',
				emptyText: '00'
			},{
				xtype: 'radio',
				name: 'locationselection',
				boxLabel: 'Postcode + huisnr.'
			},{
				xtype: 'textfield',
				name: 'postcode',
				width: 50,
				align: 'right',
				value: '',
				id: 'postcode',
				emptyText: '0000AB'
			},{
				xtype: 'numberfield',
				name: 'huisnr',
				width: 30,
				align: 'right',
				value: '',
				id: 'huisnr',
				emptyText: '00'
			}]
		},{
			fieldLabel: 'Hoogte (m)',
			xtype: 'numberfield',
			//fieldLabel: 'Hoogte',
			width: 40,
			name: 'hoogte',
			value: 1,
			disabled: false,
			hidden: false,
			id: 'stackheight',
		},{
			fieldLabel: 'Emissietype',
			xtype: 'combo',
			id: 'typeoffire',
			emptyText: '... selecteer type',
			mode:           'local',
			value:          null,
			triggerAction:  'all',
			forceSelection: false,
			editable:       false,
			disabled: false,
			//fieldLabel:     'Title',
			name:           'emissietype',
			hiddenName:     'emissietype',
			displayField:   'name',
			valueField:     'value',
			value: 			'area',
			store:          new Ext.data.JsonStore({
				fields : ['name', 'value'],
				data   : [
					{name : 'Brand',   value: 'area'},
					{name : 'Gaslek',  value: 'leak'}
				]
			}),
			listeners:{
				 'select': function(combo, record){
				 	 //TODO: enable/disable formitems
				 	 if (record.json.value == 'leak'){
				 	 	 Ext.getCmp('surface').hide();
				 	 	 Ext.getCmp('diameter').show();
				 	 	 Ext.getCmp('typeofleak').show();
				 	 }
				 	 else{
				 	 	 Ext.getCmp('surface').show();
				 	 	 Ext.getCmp('diameter').hide();
				 	 	 Ext.getCmp('typeofleak').hide();
				 	 }
				 }
			}
		},{
			fieldLabel: 'Type lek',
			xtype: 'combo',
			id: 'typeofleak',
			emptyText: '... selecteer type',
			mode:           'local',
			value:          null,
			triggerAction:  'all',
			forceSelection: false,
			editable:       false,
			hidden: 		true,
			disabled: 		false,
			//fieldLabel:     'Title',
			displayField:   'name',
			valueField:     'value',
			value: '1',
			store:          new Ext.data.JsonStore({
				fields : ['name', 'value'],
				data   : [
					{name : 'Gas-fase',   value: '1'},
					{name : 'Vloeistof fase',  value: '2'},
					{name : 'Koudgekookte plas',  value: '3'},
					{name : 'Vloeistof op land',  value: '4'}
				]
			}),
			listeners:{
				 'select': function(combo, record){
				 	 if (record.json.value == 1 || record.json.value == 2){
				 	 	 Ext.getCmp('surface').hide();
				 	 	 Ext.getCmp('diameter').show();
				 	 }
				 	 else {
				 	 	 Ext.getCmp('surface').show();
				 	 	 Ext.getCmp('diameter').hide();
				 	 }
				 }
			}
		},{
			fieldLabel: 'Brandend oppervlak (m&#178;)',
			xtype: 'numberfield',
			width: 40,
			name: 'oppervlak',
			minValue: 2,
			maxValue: 20000,
			value: 1000,
			disabled: false,
			hidden: false,
			id: 'surface'
		},{
			fieldLabel: 'Diameter (m)',
			xtype: 'numberfield',
			width: 40,
			value: 10,
			disabled: false,
			hidden: true,
			id: 'diameter',
			listeners:{
				'change':function(field,value){
					Ext.getCmp('surface').setValue(value);
				}
			}
		},{
			fieldLabel: 'Vrijkomende stoffen',
			xtype: 'combo',
			id: 'species',
			emptyText: '... selecteer stof',
			mode:           'local',
			value:          null,
			triggerAction:  'all',
			forceSelection: false,
			editable:       false,
			disabled: false,
			//fieldLabel:     'Title',
			name:           'stoffen',
			hiddenName:     'stoffen',
			displayField:   'name',
			valueField:     'value',
			value: 'no',
			store:          new Ext.data.JsonStore({
				fields : ['name', 'value'],
				data   : [
					{value: "NOX"	,name: "Stikstofoxide"},
					{value: "CO"	,name: "Koolmonoxide, 1016"},
					{value: "CO2"	,name: "Kooldioxide, 1013"},
					{value: "NO"	,name: "Stikstofmonoxide, 1660"},
					{value: "NO2"	,name: "Stikstofdioxide, 1067"},
					{value: "SO2"	,name: "Zwaveldioxide, 1079"},
					{value: "NH3"	,name: "Ammoniak, 1005"},
					{value: "C3H3N"	,name: "Acrylnitril, 1093"},
					{value: "THT"	,name: "Tetrahydrothiofeen, 2412"}
					
				]
			})
		},{
			fieldLabel: 'Uitstoot',
			xtype: 'panel',
			layout: 'table',
			layoutConfig: {
				// The total column count must be specified here
				columns: 3
        	},
        	defaults: {
				// applied to each contained panel
				padding: '0px',
				border: false,
				style: 'margin: 5px;'
			},
			items: [
				{
					html: '',
					width: '150px'
				},{
					xtype: 'radio',
					width: '100px',
					name: 'uitstootselection',
					id: 'constantemission',
					boxLabel: 'Constant',
					checked: true,
					handler: function() { 
						if (this.checked)
						{
							Ext.getCmp('timePanel').disable();
							Ext.getCmp('temperature').enable(); 
							Ext.getCmp('emission').enable(); 
						}
					}
				},{
					xtype: 'radio',
					name: 'uitstootselection',
					id: 'variableemission',
					boxLabel: 'Variabel',
					handler: function() { 
						if (this.checked)
						{
							Ext.getCmp('timePanel').enable();
							Ext.getCmp('temperature').disable(); 
							Ext.getCmp('emission').disable(); 
						}
					}
				},{
					html: 'Temperatuur &deg;C'
				},{
					xtype: 'numberfield',
					width: 40,
					id: 'temperature',
					value: 800,
				},{
					html: 'Kies een variabele emissie en temperatuur op het tabblad \'Tijdverloop\'',
					rowspan: 2
				},{
					html: 'Emissie (Kg/s)'
				},{
					xtype: 'numberfield',
					width: 40,
					id: 'emission',
					value: 1
				}
			]
		},{
			fieldLabel: 'Gridcel',
			xtype: 'combo',
			id: 'gridsize',
			mode:           'local',
			value:          null,
			triggerAction:  'all',
			forceSelection: false,
			editable:       false,
			disabled: false,
			//fieldLabel:     'Title',
			name:           'gridcel',
			hiddenName:     'gridcel',
			displayField:   'name',
			valueField:     'value',
			value: 150,
			store:          new Ext.data.JsonStore({
				fields : ['name', 'value'],
				data   : [
					{name : '50',   value: '50'},
					{name : '100',  value: '100'},
					{name : '150',  value: '150'},
					{name : '200',  value: '200'},
					{name : '250',  value: '250'}
				]
			})
		}
		]
		
});

var graphPanel = new Ext.Panel({
		title: 'Grafiek',
		id: 'graphPanel',
		html: "<div id='chart'><svg> </svg></div>",
		listeners: {
			'afterrender': function(){
				firstDraw();
			}
		}
});

var profielPanel = new Ext.Panel({
		title: 'Dwarsprofiel',
		id: 'profielPanel',  //TODO: height is workaround for FF
		html: "<div id='profiel'><svg height='250px'></svg></div>"
});

var timePanel = new Ext.Panel({
		title: 'Tijdverloop',
		disabled: true,
		id: 'timePanel',
		items: [
			emissieGrid,
			graphPanel
		]
});


var modelWindow = new Ext.Window({
		id: 'modelWindow',
		title: 'Simulatie',
		closable: false,
		closeAction: 'hide',
		hideable: true,
		resizable: true,
		draggable: true,
		width: '600',
		height: '600',
		plain: true,
		layout: 'fit',
		modal: false,
		items:
			new Ext.TabPanel({
				autoTabs:true,
				activeTab:0,
				deferredRender:false,
				border:false,
				items:[
					basisPanel,
					timePanel
				]
                })
        ,
		buttons:[
		{
			text: 'Valideren', 
			handler: function()	{  fireSmoke(true) }
		},{
			text: 'Start',
			id: 'smokestart_btn',
			disabled: true,
			handler: function()	{ 
				modelWindow.hide();
				fireSmoke(false); 
			}
		},{
			text: 'Reset', 
			handler: function()	{ alert('todo'); }
		},{
			text: 'Annuleren', 
			handler: function()	{ modelWindow.hide(); }
		},]
});

var visibilityWindow = new Ext.Window({
		id: 'visibilityWindow',
		title: 'Weergave',
		closable: true,
		closeAction: 'hide',
		resizable: true,
		draggable: true,
		width: '200',
		height: '600',
		//plain: true,
		//layout: 'fit',
		modal: false,
		items: [{
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
							visibleLayers[object.itemId] = object.checked;
							modelresults[i].redraw();
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
					{
						xtype: 'checkbox',	fieldLabel: 'KNMI',itemId: 'knmi',
						checked: true,
						handler: function(object){
							var arr = app.mapPanel.map.getLayersByName("KNMI stations");
							arr[0].setVisibility(object.checked);
						}
					}	
				]
			},{
				xtype: 'fieldset',
				title: 'Toon',
				defaultType: 'checkbox',
				defaults: {
					handler: function(object){
						visibleLayers[object.itemId] = object.checked;
						//GRID
						for (i=0;i<modelresults.length;i++){
							visibleLayers[object.itemId] = object.checked;
							modelresults[i].redraw();
						}
					}
				},
				
				items: [
				{fieldLabel: 'Land grid',itemId: 'landgrid'}
				]
			}]
		}]
});

/****** START OF CHART ****/


// create graph now that we've added presentation config
var chart1;
var chartdata1 = function() {
	var data = [];
	var time = [];
	var temperatuur = [];
	var emissie = [];
	jsonData = emissieStore.getRange();
	jsonData.forEach(function(d, i) {
		temperatuur.push({x:d.data.hours,y:d.data.temperatuur});
		emissie.push({x:d.data.hours,y:d.data.emissie});
	});
	data[0] = {
		values: temperatuur,
		type: "line",
		key: 'Temperatuur',
		color: 'red',
		yAxis:1
	}
	data[1] = {
		values: emissie,
		type: "line",
		key: 'Emissie',
		color: 'steelBlue',
		yAxis:2
	}
	return data;
}
	
	
function firstDraw() {
	nv.addGraph(function() {
	  var chart1 = nv.models.multiChart()
	  	.width(200)
	  	.height(200);
		
	  chart1.xAxis
	  	.axisLabel('Tijd (u.)')
	  	.tickFormat(d3.format(',f'));
	  chart1.yAxis1
	  	.axisLabel('Temp (celc.)')
        .tickFormat(d3.format(',.1f'));
      chart1.yAxis2
      	.axisLabel('Emissie (kg/s)')
        .tickFormat(d3.format(',.1f'));
        
	  d3.select('#chart svg')
	  	.datum(chartdata1)
	  	.transition().duration(500)
	  	.call(chart1);
	  
	  nv.utils.windowResize(function() { 
	  	d3.select('#chart svg').call(chart1) 
	  });
	
	  return chart1;
	});
}

function updateChart(){
	if (chart1){
		d3.select('#chart svg').datum(chartdata1)
			.transition().duration(500)
			.call(chart1);
		nv.utils.windowResize(chart1.update);
    }
}

	
/******* END OF CHART ******************/

Ext.namespace("gmi");

gmi.ModelPanel = Ext.extend(Ext.Panel, {
		title: null,
		id: null,
		currentModel: null,
		autoScroll: true,
		initComponent: function(){
			this.addEvents("ready");
			this.items = [{
				title:'Bediening',
				xtype: 'panel',
				layout: 'fit',
				height: 200,
				width: '100%',
				items: [{
					xtype: 'panel',
					layout: {
						type:  "vbox",
						align: "center"
					},
					defaults: {
						xtype: 'button',
						style: 'padding-top: 10px;',
						width: 80
					},
					items: [
						{
							text: 'Start',
							handler: function() {modelWindow.show();}
						},{
							text: 'Weergave',
							handler: function() {visibilityWindow.show();
							}
						},{
							text: 'Beheer',
							handler: function() {beheerWindow.show();}
						}
					]
				}]
			},{
				title:'Simulaties',
				xtype: 'panel',
				layout: 'fit',
				height: 200,
				width: '100%',
				items: [simulatiesGrid] //gridpanel with archive of simulations 
			},{
				title:'Info',
				id: 'rookpluiminfopanel',
				hidden: true, //uitgeschakeld tot nader order
				xtype: 'panel',
				layout: 'fit',
				height: 200,
				width: '100%',
				items: [] //overview of parameters for selected simulation(s)
			},{
				title:'Voortgang',
				id: 'pbarpanel',
				xtype: 'panel',
				//layout: 'vbox',
				height: 200,
				width: '100%',
				items: [] //Contents are scripted 
			}];
			gmi.ModelPanel.superclass.initComponent.apply(this,arguments);
		},
		whateverfunction: function(){
		}
		
});

Ext.reg("gmi_modelpanel", gmi.ModelPanel);
