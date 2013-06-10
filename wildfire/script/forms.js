var forms = new Array();

forms["terreinpanel"] = new Ext.form.FormPanel({
	title: "Stap 1 - Terrein",
	//html: "Create conversion parameters and select area in the map by dragging a box around it. This will be the models boundary.",
	id: "farsitepanel1",
	labelWidth: 40,
	labelAlign: 'left',
	layout: {
		type:  "form",
		align: "center",
	},
	defaults: {
		style: 'margin: 5px;',
	},
	items: [
	/*	{
			xtype:'fieldset',
			id: 'fieldset_conversie',
			title: 'Conversie',
			defaults: {
				width: 150,
			},
			items: [
				actions["landuse2fuel"]
			]
		},{
			xtype: 'fieldset',
			id: 'fieldset_nieuwbestaand',
			title: 'Nieuw of bestaand',
			defaults: {
				width: 150,
			},
			items: [
				actions["newfuelmodel"],
				actions["existingfuelmodel"]
			]
		},
	*/	{
			xtype: 'fieldset',
			title: 'Selecteer terrein',
			defaults: {
				width: 150,
			},
			items: [
				{
					xtype: "panel", //need this to put plugin-terrein in 
					defaults: {width: 150, style: 'margin: 0px;'},
					id: "terreinpanel1", 
					border: false
				},{
					xtype: 'numberfield',
					fieldLabel: 'Terrein ID',
					width: 40,
					name: 'terrein_id',
					disabled: true,
					hidden: true,
					value: '1',
					id: 'terrein_id',
				}
			]
		},{
			xtype: 'fieldset',
			title: 'Bewerk terrein',
			defaults: {
				width: 150,
			},
			items: [
				{
					xtype: "panel", //need this to put edit-tool in 
					defaults: {width: 150, style: 'margin: 0px;'},
					id: "terreineditpanel1", 
					border: false
				}
			]
		},{
			xtype: 'fieldset',
			title: 'Opslaan',
			defaults: {
				width: 150,
			},
			items: [
			{
				fieldLabel: 'Naam',
				xtype: 'textfield',
				name: 'fuelmodel_name',
				width: 100,
				align: 'right',
				value: '',
				id: 'fuelmodel_name',
				//style: 'padding: 0px;'
			},
				actions["makeLcp"]
			]
		}
	]
});

forms["ignitepanel"] = new Ext.form.FormPanel({
	title: "Stap 2 - Start model",
	//html: "Set wind and weather parameters and ignite the fire by clicking on a location within the model",
	id: "farsitepanel3",
	labelWidth: 40,
	labelAlign: 'left',
	layout: {
		type:  "form",
		align: "center"
	},
	defaults: {
		style: 'margin: 5px;',
	},
	items: [
		{
			xtype: 'fieldset',
			id: 'fieldset_terrein',
			hidden: false,
			collapsible: true,
			collapsed: true,
			title: 'Brandstofmodel',
			defaults: {
				width: 150,
			},
			items: [
				{
				fieldLabel: 'ID',
				xtype: 'numberfield',
				name: 'fuelmodel_id',
				width: 40,
				disabled: false,
				align: 'right',
				value: '1836',
				id: 'fuelmodel_id',
				style: 'margin: 5px;'
			}
			]
		},{
			xtype: 'fieldset',
			title: 'Weer',
			defaults: {
				width: 150,
			},
			items: [
				actions["weatheredit"]
			]
		},{
			xtype: 'fieldset',
			title: 'Brand',
			defaults: {
				width: 150,
			},
			items: [
			{
				fieldLabel: 'Naam',
				xtype: 'textfield',
				name: 'ignition_name',
				width: 100,
				align: 'right',
				value: '',
				id: 'ignition_name',
			},{
				xtype: "panel", 
				id: "ignitepanel1", 
				border: false
			},{
				xtype: "panel", 
				id: "layerinfopanel1", 
				border: false
			}
			]
		}
	]
});

var wildfirePanel = new Ext.Panel({
		id: "wildfirepanel",
		title: "Natuurbrandmodel",
		xtype: "panel",
		region: 'center',
		//layout: 'anchor',
		autoScroll: true,
		items: [
			//actions["advanced_switch"],
			forms["terreinpanel"],
			forms["ignitepanel"]
			,{
				xtype: "panel",
				hidden: true,
				title: "Stap 3 - Download",
				id: "farsitepanel4",
				height: 100,
				layout: {
					type:  "vbox",
					align: "center"
				},
				defaults: {
					style: 'padding: 10px;',
					width: 150,
				},
				items: [{
					html: 'Download mdel resultaten als shapefile <br> <a target="_blank" href="http://model.geodan.nl/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=model_wildfire:bergen2_perim&maxFeatures=1000&outputFormat=SHAPE-ZIP">Klik hier om te downloaden</a>'
				}],
				
			},{
				xtype: "panel",
				title: "Voortgang",
				id: "progresspanel",
				padding: 5
			}
		]
});
