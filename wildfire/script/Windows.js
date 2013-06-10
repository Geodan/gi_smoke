

var projectWindow = new Ext.Window({
		id: 'projectWindow',
		title: 'Selecteer project',
		closable: true,
		closeAction: 'hide',
		hideable: true,
		resizable: true,
		draggable: true,
		modal: true,
		width: '40%',
		height: '200',
		plain: true,
		layout: 'fit',
		modal: false,
		items: [],
		buttons:[{
				text: 'Sluiten', 
				handler: function()	{ projectWindow.hide(); }
		}]
});
projectWindow.hide();


var fuelmodelWindow = new Ext.Window({
		id: 'fueldmodelWindow',
		title: 'Select fuelmodel',
		closable: true,
		closeAction: 'hide',
		hideable: true,
		resizable: true,
		draggable: true,
		modal: true,
		width: '40%',
		height: '200',
		plain: true,
		layout: 'fit',
		modal: false,
		items: [processGrid],
		buttons:[{
				text: 'Sluiten', 
				handler: function()	{ fuelmodelWindow.hide(); }
		}]
});
fuelmodelWindow.hide();



var windWindow= new Ext.Window({
		id: 'windWindow',
		title: 'Wind komende uren',
		closable: true,
		closeAction: 'hide',
		hideable: true,
		resizable: true,
		draggable: true,
		modal: true,
		width: '40%',
		height: '600',
		plain: true,
		layout: 'fit',
		modal: false,
		items: [windGrid],
		buttons:[{
				text: 'Sluiten', 
				handler: function()	{ windWindow.hide(); }
		}]
	});
	windWindow.hide();

var weatherWindow= new Ext.Window({
		id: 'weatherWindow',
		title: 'Weer afgelopen dagen',
		closable: true,
		closeAction: 'hide',
		hideable: true,
		resizable: true,
		draggable: true,
		modal: true,
		width: '40%',
		height: '600',
		plain: true,
		layout: 'fit',
		modal: false,
		items: [weatherGrid],
		buttons:[{
				text: 'Sluiten', 
				handler: function()	{ weatherWindow.hide(); }
		}]
	});
	weatherWindow.hide();	
	
var landuse2fuelWindow= new Ext.Window({
		id: 'landuse2fuelWindow',
		title: 'Conversion landuse to fuel',
		closable: true,
		closeAction: 'hide',
		hideable: true,
		resizable: true,
		draggable: true,
		modal: true,
		width: '40%',
		height: '600',
		plain: true,
		layout: 'fit',
		modal: false,
		items: [landuse2fuelGrid],
		buttons:[{
				text: 'Close', 
				handler: function()	{ landuse2fuelWindow.hide(); }
		}]
	});
	landuse2fuelWindow.hide();
	
var fueltypesWindow = new Ext.Window({
		id: 'fueltypesWindow',
		width:600,
		height:600,
		closable: true,
		closeAction: 'hide',
		autoScroll:true,
		autoLoad:{
			url:'fueltypes.html'
		},
		title:"Fueltypes",
		tbar:[{
			text:'Reload',
			handler:function() {
				fueltypesWindow.load(fueltypesWindow.autoLoad.url + '?' + (new Date).getTime());
			}
		}],
		listeners:{show:function() {
			this.loadMask = new Ext.LoadMask(this.body, {
				msg:'Loading. Please wait...'
			});
		}},
		buttons:[{
				text: 'Sluiten', 
				handler: function()	{ fueltypesWindow.hide(); }
		}]
});
fueltypesWindow.hide();

var weathersettingsWindow = new Ext.Window({
		title: "Weersomstandigheden",
		id: 'weathersettingsWindow',
		width:600,
		height:600,
		closable: true,
		closeAction: 'hide',
		autoScroll:true,
		hideable: true,
		resizable: true,
		draggable: true,
		modal: true,
		width: '40%',
		height: '600',
		plain: true,
		layout: 'vbox',
		modal: false,
		items: [weatherGrid, windGrid],
		buttons:[{
				text: 'Sluiten', 
				handler: function()	{ weathersettingsWindow.hide(); }
		}]
});

weathersettingsWindow.hide();
