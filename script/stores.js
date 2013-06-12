
/******
	Terrein runs store
*****/

var modelresults = new Array();

var ProcessIdReader = new Ext.data.ArrayReader(
	{id:'run'}, 
	[
        'run',
        'name',
    ]);

var processStore = new Ext.data.Store({                                      
    reader: ProcessIdReader,
    sortInfo: { field: "run", direction: "DESC" },
    reloadme: function() {
    	Ext.Ajax.request({
			//TODO
			url:'/wildfire/pywps/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getTerreinen&datainputs=',
			//headers: { Authorization : auth },
			success: terreinReady
		});
    }    
});


var processColModel = new Ext.grid.ColumnModel({
	defaults: {
		width: 80,
		sortable: true
	},
	columns: [
		{id: 'name', header: 'Name', width: 80, sortable: true, dataIndex: 'name'},
		{id: 'run', header: 'Run id', width: 40, sortable: true, dataIndex: 'run'},
		{
			xtype: 'actioncolumn',
			width: 50,
			items: [{
				icon: '/rookpluim/images/icons/silk/icons/add.png',  // Use a URL in the icon config
				tooltip: 'Add to map',
				handler: function(grid, rowIndex, colIndex) {
					var rec = processStore.getAt(rowIndex);
					var processid = rec.get('run');
					
					//add terrein to map
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
						app.mapPanel.layers.add(record);
					},2000);
					
					//- set correct terrein id in interface
					Ext.getCmp('terrein_id').setValue(processid);
					//Close this window
					fuelmodelWindow.hide();
				}
			}]
		}
	]
}); 

var processGrid = new Ext.grid.GridPanel({
		store: processStore,
		//title: "Processes",
		colModel: processColModel,
		height: 400
});



/**********
	Data actions.
	Are being attached to datagrids
**********/

var dataActions = new Array();

dataActions["opslaan"] = new GeoExt.Action({
		/**********
			Open window for calculating new values
		**********/
		text: "Wijzigingen opslaan",
		handler: function(){
			landuse2fuelDataStore.save();
		}
});	


var localWindData = 
	{"total":"6",
	"results":[
		{"project":"0","id":"45","date":"2011-11-11","time":"12:00:00","speed":"0","direction":"180","cl":"10","datetime":null},
		{"project":"0","id":"43","date":"2011-11-11","time":"13:00:00","speed":"0","direction":"180","cl":"10","datetime":null},
		{"project":"0","id":"42","date":"2011-11-11","time":"14:00:00","speed":"0","direction":"180","cl":"10","datetime":null},
		{"project":"0","id":"46","date":"2011-11-11","time":"15:00:00","speed":"0","direction":"180","cl":"10","datetime":null},
		{"project":"0","id":"47","date":"2011-11-11","time":"16:00:00","speed":"0","direction":"180","cl":"10","datetime":null},
		{"project":"0","id":"44","date":"2011-11-11","time":"17:00:00","speed":"0","direction":"180","cl":"10","datetime":null}
	]};
	
function setWindHours() {
	var myDate=new Date();
	myDate.setSeconds(0);
	for (var i=0;i< localWindData.total; i++) {
		localWindData.results[i].date = myDate.format('yyyy-MM-dd'); 
		localWindData.results[i].time = myDate.format('hh:mm:ss');
		myDate.setHours(myDate.getHours()+1);
	} 
}
setWindHours();
	
var windStore = new Ext.data.Store({
		id: 'windStore',
		autoSave: false,/*
		writer: new Ext.data.JsonWriter({
				writeAllFields: true,
				encode: true
		}),*/
		sortInfo: { field: "time", direction: "ASC" },
		reader: new Ext.data.JsonReader({
			// metadata configuration options:
			idProperty: 'id',
			root: 'results',
			totalProperty: 'total',
			messageProperty: 'message',
			succesProperty: 'success',
			fields:
			[
				{name: 'project', type: 'int'},
				'id',
				//{name: 'datetime', type: 'date', dateFormat: 'Y-m-d H:i:s'},
				{name: 'date', type: 'date', dateFormat: 'Y-m-d'},
				{name: 'time', type: 'time', timeFormat: 'H:i'},
				{name: 'speed', type: 'int'},
				{name: 'direction', type: 'int'},
				{name: 'cl', type: 'int'}
			]}
		)/*,
		proxy: new Ext.data.HttpProxy({
			api:{                  
				read: 	'/wildfire/php/hub_data.php?tablename=windsettings&task=READ',
				update: '/wildfire/php/hub_data.php?tablename=windsettings&task=UPDATE',
				destroy: '/wildfire/php/hub_data.php?tablename=windsettings&task=DESTROY',
				create: '/wildfire/php/hub_data.php?tablename=windsettings&task=CREATE'
			}
		})*/
		
});
windStore.loadData(localWindData);
windStore.sortByFields([{'field':'date','direction':'ASC'},{'field':'time','direction':'ASC'}]);

var windColumnModel = new Ext.grid.ColumnModel({
	 defaults: {
            sortable: false // columns are not sortable by default           
   },
   columns:	[
   	 {
			header: 'Datum',
			editable: false,
			dataIndex: 'date',
			format: 'd-m-Y',
			width: 10,
			xtype: 'datecolumn',
			editor: new Ext.form.DateField({  // rules about editing
				format: 'Y-m-d',
				allowBlank: false,
				maxLength: 10
			})
		},{
			header: 'Tijd',
			editable: false,
			dataIndex: 'time', 
			width: 10,
			editor: new Ext.form.TimeField({  // rules about editing
				allowBlank: false,
				maxLength: 10
			})
		},{
			header: 'Snelh. (km/h)',
			dataIndex: 'speed',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 3
			})
		},{	
			header: 'Richting (0-360)',
			dataIndex: 'direction',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 3
			})
		},{	
			header: 'Bewolking',
			dataIndex: 'cl',
			editable: true,
			hidden: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 3
			})
		}
		]
});
var windGrid = new Ext.grid.EditorGridPanel({
		id: 'windgrid',
		title: 'Wind komende uren',
		store: windStore,
		cm: windColumnModel,
		height: 200,
		clicksToEdit:1,
		enableColLock:false,
		loadMask: true,
		viewConfig: {
				 forceFit: true
		},
		listeners: {
        },
		tbar: [
			/* TT: Toevoegen / verwijderen uitgeschakeld
			{    
			text: 'Add Record',
            handler: function(){
                // access the Record constructor through the grid's store
                
                var newRec = windStore.recordType;
                var p = new newRec({
                		time: "12:00",
                		direction: "0",
                		speed: "20"
                		
                });
                windGrid.stopEditing();
                windStore.insert(0, p);
                windStore.save();
                windStore.reload();
                windGrid.startEditing(0, 0);
            }
		},{
			text: 'Delete records',
			handler: function(){
				//delete records
				var selected = windGrid.getSelectionModel().getSelectedCell();

				Ext.MessageBox.confirm(
					'Confirm delete',
					'Are you sure?',
					function(btn) {
						if (btn == 'yes') {
							var recordToDelete = windStore.getAt(selected[0]);
							windStore.remove(recordToDelete);
							windStore.save();
							windStore.reload();
						}
					}
				);
			}
		},{
			text: "Wijzigingen opslaan",
			handler: function(){
				windStore.save();
				windStore.reload();
			}
		}*/]
});


/*********************
	weather store
*********************/
/* TT: alleen nog gebruik van lokale data */
var localWeatherData = 
	{"total":"6",
	"results":[
		{"project":"0","id":"1","date":"2011-11-07","rn":"0","am":"500","pm":"1500","tlo":"15","thi":"32","hhi":"60","hlo":"15","elv":"0"},
		{"project":"0","id":"2","date":"2011-11-08","rn":"0","am":"500","pm":"1500","tlo":"15","thi":"32","hhi":"50","hlo":"10","elv":"0"},
		{"project":"0","id":"3","date":"2011-11-09","rn":"0","am":"500","pm":"1500","tlo":"15","thi":"32","hhi":"50","hlo":"11","elv":"0"},
		{"project":"0","id":"4","date":"2011-11-10","rn":"0","am":"500","pm":"1500","tlo":"15","thi":"32","hhi":"60","hlo":"10","elv":"0"},
		{"project":"0","id":"5","date":"2011-11-11","rn":"0","am":"500","pm":"1500","tlo":"15","thi":"32","hhi":"50","hlo":"10","elv":"0"},
		{"project":"0","id":"6","date":"2011-11-12","rn":"0","am":"500","pm":"1500","tlo":"15","thi":"32","hhi":"50","hlo":"10","elv":"0"}
	]};
	
/* TT: mmh, slightly overkill to set something simple as an array of dates */
function setWeatherDates() {
	var myDate=new Date();
	myDate.setDate(myDate.getDate() - (localWeatherData.total -1));
	for (var i=0;i<localWeatherData.total;i++) {
		myDate.setDate(myDate.getDate()+1);
		localWeatherData.results[i].date = myDate.format("yyyy-MM-dd");
	}; 
}
setWeatherDates();

var weatherStore = new Ext.data.Store({
		id: 'weatherStore',
		autoSave: false,
		/*writer: new Ext.data.JsonWriter({
				writeAllFields: true,
				encode: true
		}),*/
		reader: new Ext.data.JsonReader({
			// metadata configuration options:
			idProperty: 'id',
			root: 'results',
			totalProperty: 'total',
			messageProperty: 'message',
			succesProperty: 'success',
			fields:[
				{name: 'project', type: 'int'},
				'id',
				{name: 'date', type: 'date', dateFormat: 'Y-m-d'},
				{name: 'rn', 	type: 'int'},  
				{name: 'am', 	type: 'int'},  
				{name: 'pm', 	type: 'int'},  
				{name: 'tlo', 	type: 'int'}, 
				{name: 'thi', 	type: 'int'}, 
				{name: 'hhi', 	type: 'int'}, 
				{name: 'hlo', 	type: 'int'}, 
				{name: 'elv', 	type: 'int'} 
			]}
		)/*,
		proxy: new Ext.data.HttpProxy({
			api:{                  
				read: 	'/wildfire/php/hub_data.php?tablename=weathersettings&task=READ',
				update: '/wildfire/php/hub_data.php?tablename=weathersettings&task=UPDATE',
				destroy: '/wildfire/php/hub_data.php?tablename=weathersettings&task=DESTROY',
				create: '/wildfire/php/hub_data.php?tablename=weathersettings&task=CREATE'
			}
		})*/
});
weatherStore.loadData(localWeatherData);


var weatherColumnModel = new Ext.grid.ColumnModel({
	 defaults: {
            sortable: false // columns are not sortable by default           
   },
   columns:	[
   	 {
			header: 'Datum',
			editable: false,
			dataIndex: 'date',
			format: 'd-m-Y',
			width: 10,
			xtype: 'datecolumn',
			editor: new Ext.form.DateField({  // rules about editing
				format: 'Y-m-d',
				allowBlank: false,
				maxLength: 10
			})
		},{
			header: 'Regen (mm)',
			dataIndex: 'rn',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 2
			})
		},{	
			header: 'AM',
			dataIndex: 'am',
			hidden: true,
			editable: false,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 4
			})
		},{	
			header: 'PM',
			dataIndex: 'pm',
			editable: false,
			hidden: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 4
			})
		},{	
			header: 'Temp min (Celc)',
			dataIndex: 'tlo',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 2
			})
		},{	
			header: 'Temp max (Celc)',
			dataIndex: 'thi',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 2
			})
		},{	
			header: 'LVocht. max (%)',
			dataIndex: 'hhi',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 2
			})
		},{	
			header: 'LVocht. min (%)',
			dataIndex: 'hlo',
			editable: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 2
			})
		},{	
			header: 'Hoogte',
			dataIndex: 'elv',
			editable: true,
			hidden: true,
			width: 10,
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 4
			})
		}
		]
});
var weatherGrid = new Ext.grid.EditorGridPanel({
		id: 'weathergrid',
		title: 'Weer afgelopen dagen',
		store: weatherStore,
		cm: weatherColumnModel,
		height: 200,
		clicksToEdit:1,
		enableColLock:false,
		loadMask: true,
		viewConfig: {
				 forceFit: true
		},
		listeners: {
        },
		tbar: [
			/* TT: Toevoegen / verwijderen uitgeschakeld
			{    
			text: 'Add Record',
            handler: function(){
                // access the Record constructor through the grid's store
                
                var newRec = weatherStore.recordType;
                var p = new newRec({
                		rn: "0",
                		am: "0"
                });
                weatherGrid.stopEditing();
                weatherStore.insert(0, p);
                weatherStore.save();
                weatherStore.reload();
                weatherGrid.startEditing(0, 0);
            }
		},{
			text: 'Delete records',
			handler: function(){
				//delete records
				var selected = weatherGrid.getSelectionModel().getSelectedCell();

				Ext.MessageBox.confirm(
					'Confirm delete',
					'Are you sure?',
					function(btn) {
						if (btn == 'yes') {
							var recordToDelete = weatherStore.getAt(selected[0]);
							weatherStore.remove(recordToDelete);
							weatherStore.save();
							weatherStore.reload();
						}
					}
				);
			}
		},{
			text: "Wijzigingen opslaan",
			handler: function(){
				weatherStore.save();
				weatherStore.reload();
			}
		}*/]
});
/*********************
	landuse2fuel store
*********************/

// create reusable renderer
Ext.util.Format.comboRenderer = function(combo){
    return function(value){
        var record = combo.findRecord(combo.valueField, value);
        return record ? record.get(combo.displayField) : combo.valueNotFoundText;
    }
}

var fuelTypeCombo = new Ext.form.ComboBox({
	typeAhead: true,
    triggerAction: 'all',
    lazyRender:true,
    store: new Ext.data.JsonStore({
		// store configs
		autoDestroy: true,
		autoLoad: true,
		//TODO: change into WPS
		url: '/wildfire/php/get_fuelmodels.php',
		storeId: 'myStore',
		// reader configs
		root: 'results',
		idProperty: 'fuel_id',
		fields: ['fuel_id','description', 'carrier']
	}),
    valueField:'fuel_id',
    displayField:'description',
    mode:'remote'
    // rest of config
});

dataActions["landuse_add"] = new GeoExt.Action({
		/**********
			Add a record to the current grid
		**********/
		//TT: werkt nu alleen maar voor intensiteitengrid
		text: "Toevoegen",
		handler: function(){
			// access the Record constructor through the grid's store
			var newRec = landuse2fuelGrid.getStore().recordType; 
			var p = new newRec({});
			landuse2fuelGrid.stopEditing();
			landuse2fuelDataStore.insert(0, p);
			landuse2fuelGrid.startEditing(0, 0);
		}
});

var landuse2fuelDataStore = new Ext.data.Store({
	id: 'LandUse2Fuel',
	autoLoad: true,
	autoSave: false,
	writer: new Ext.data.JsonWriter({
			writeAllFields: true,
			encode: true
	}),
	sortInfo: { field: "landuse_id", direction: "ASC" },
	reader: new Ext.data.JsonReader({   
		// we tell the datastore where to get his data from
		root: 'results',
		remoteSort: true,
		totalProperty: 'total',
		successProperty: 'succes',
		idProperty: 'id',
		fields:
		[
			'id',
			{name: 'landuse_id'		,type:'int', 	mapping: 'landuse_id'},
			{name: 'landuse_name'	,type:'string', mapping: 'landuse_name'},
			{name: 'fuel_id'		,type:'int', 	mapping: 'fuel_id'	}
		]}
	),
	proxy: new Ext.data.HttpProxy({
			//TODO: change to WPS
			api:{                  
				read: 	'/wildfire/php/hub_data.php?tablename=landuse2fuel&task=READ',
				update: '/wildfire/php/hub_data.php?tablename=landuse2fuel&task=UPDATE',
				destroy: '/wildfire/php/hub_data.php?tablename=landuse2fuel&task=DESTROY',
				create: '/wildfire/php/hub_data.php?tablename=landuse2fuel&task=CREATE'
			}
	})

});

var landuse2fuelColumnModel = new Ext.grid.ColumnModel({
	 defaults: {
            sortable: true // columns are not sortable by default           
   },
   columns:	[
   	{
			header: 'id',
			width: 4,
			dataIndex: 'landuse_id',
			editor: new Ext.form.NumberField({  // rules about editing
				allowBlank: false,
				maxLength: 20
			})
		},{	
			header: 'Landuse',
			width: 10,
			dataIndex: 'landuse_name',
			editor: new Ext.form.TextField({  // rules about editing
					allowBlank: false,
					maxLength: 20,
					maskRe: /([a-zA-Z0-9\s]+)$/   // alphanumeric + spaces allowed
				})
		},{	
			header: 'Fueltype',
			width: 30,
			dataIndex: 'fuel_id',
			editor: fuelTypeCombo,
			renderer: Ext.util.Format.comboRenderer(fuelTypeCombo) // pass combo instance to reusable renderer
		}
	]
});

var landuse2fuelGrid = new Ext.grid.EditorGridPanel({
		id: 'landuse2fuel',
		//title: 'Conversie landuse naar fueltype',
		store: landuse2fuelDataStore,
		cm: landuse2fuelColumnModel,
		height: 200,
		clicksToEdit:1,
		enableColLock:false,
		loadMask: true,
		viewConfig: {
				 forceFit: true
		},
		tbar: [{    
			text: 'Add Record',
            handler: function(){
                // access the Record constructor through the grid's store
                var newRec = landuse2fuelDataStore.recordType;
                var p = new newRec({
                		landuse_id: 0,
                		landuse_name: 'new',
                });
                landuse2fuelGrid.stopEditing();
                landuse2fuelDataStore.insert(0, p);
                landuse2fuelDataStore.save();
                landuse2fuelDataStore.reload();
                landuse2fuelGrid.startEditing(0, 0);
            }
		},{
			text: 'Delete records',
			handler: function(){
				//delete records
				var selected = landuse2fuelGrid.getSelectionModel().getSelectedCell();

				Ext.MessageBox.confirm(
					'Confirm delete',
					'Are you sure?',
					function(btn) {
						if (btn == 'yes') {
							var recordToDelete = landuse2fuelDataStore.getAt(selected[0]);
							landuse2fuelDataStore.remove(recordToDelete);
							landuse2fuelDataStore.save();
							landuse2fuelDataStore.reload();
						}
					}
				);
			}
		},{
			text: "Wijzigingen opslaan",
			handler: function(){
				landuse2fuelDataStore.save();
				landuse2fuelDataStore.reload();
			}
		}]
		
});

