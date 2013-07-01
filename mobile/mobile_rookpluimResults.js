var modelresults;
var visibleLayers = {};
visibleLayers.vector = true;
function rookpluimresults(processid, title){
	this.chart;
	this.processid = processid;
	this.title = title;
	this.paramjson;
	var self=this;
	var colors = ["red", "yellow", "orange"];
	this.contourStyle = function(feature){
		if (feature.properties.ID != null)
        	var color = colors[feature.properties.ID];
        else color = "blue";
        return {
			"color": color,
			"weight": 2,
			"opacity": 1
		}
    };
    		
    this.contourStyleOpaq = function(feature){
    	if (feature.properties.ID != null)
        	var color = colors[feature.properties.ID];
        else color = "blue";
        return {
			"color": "#ff7800",
			"weight": 2,
			"opacity": 0.3
		}
    };
	
    this.gridStyle = {
    	"color": "steelBlue",
    	fillOpacity: 0,
		"weight": 2,
		"opacity": 1
    };
    
	this.paramStore = {};
	this.processid = processid.toString(); //TODO: make non-global
	this.parampanel = {};
	this.processParams = function(response) {
		$xml = $( response );
		var nodeException = $xml.find('ows\\:Exception, Exception');
		if (nodeException.length > 0) //error, show a message
		{
			console.warn($xml.find('ows\\:ExceptionText, ExceptionText').text());
			return;
		}
		var $outputs = $xml.find('wps\\:Output, Output');
		var paramjson = {};
		$outputs.each(function(){
			var key = $(this).find("ows\\:Identifier, Identifier").text();
			var title = $(this).find("ows\\:Title, Title").text();
			var value = $(this).find("ows\\:LiteralData, LiteralData").text();
			paramjson[key] = value;
		});
		self.paramjson = paramjson;
	} 
	
	/**
		Callback loop to see if modelresults are available or still archived
	**/
	var gettingResults = function(response) {
		$xml = $( response );
		var nodeException = $xml.find('ows\\:Exception, Exception');
		if (nodeException.length > 0) //error, show a message
		{
			console.warn($xml.find('ows\\:ExceptionText, ExceptionText').text());
			return;
		}			
			
		var processid;
		var archive;
		var datastore;
		var $outputs = $xml.find('wps\\:Output, Output');
		$outputs.each(function(){
			 if ($(this).find('ows\\:Identifier, Identifier').text() == 'archiveid')
				 archive = $(this).find('wps\\:LiteralData, LiteralData').text();
			 if ($(this).find('ows\\:Identifier, Identifier').text() == 'processid')
				 processid = $.trim($(this).find('wps\\:LiteralData, LiteralData').text());
			 if ($(this).find('ows\\:Identifier, Identifier').text() == 'datastore')
				 datastore = $(this).find('wps\\:LiteralData, LiteralData').text();
		});
		
		if (archive == 0 || archive == 2) //we're done
		{
			var url= ProxyHost + escape("http://smoke-plume.argoss.nl/geoserver/"+processid+"/wms?request=getCapabilities");
			$.ajax({
				url:url,
				success:function(result){
					self.createLayers(result);
				}
			});
		}
		else //we're not done, stay in the loop
		{
			var makeRequest = function() {
				var url= ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getmodelresults&datainputs=[processid='+processid+']');
				$.ajax({url:url,success:function(result){
					gettingResults(result);
				}});
				
			}
			var t=setTimeout(makeRequest,3000); //Loop every 3 secs
		}
			
	}
	
	/***** START OF weergaveWindow ***/
	
	this.weergaveWindow = {};
	/***** END OF weergaveWindow ***/

	//this.visibleLayers = [];
	
	this.layers = {};
	this.layers.vector = [];
	this.layers.rekengrid;
	
	//Request the archive status. Callback will do the rest
	var url= ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getmodelresults&datainputs=[processid='+processid+']');
	$.ajax({url:url,success:function(result){
		gettingResults(result);
	}});
	
	
	this.createLayers = function(response){
		self.clearOldLayers();//first remove existing vector layers
		$xml = $( response );
		/* Doesn't work for Capabilities document, there's always an exception
		var nodeException = $xml.find('Exception');
		if (nodeException.length > 0) //error, show a message
		{
			console.warn('Error!');
			return;
		}*/
		$names = $xml.find('Layer Layer[queryable=1] Name');
		$names.each(function(){
			var name = $(this).text();
			var url = ProxyHost + escape("http://smoke-plume.argoss.nl/geoserver/"+processid+"/ows?service=WFS&version=1.0.0&request=GetFeature&typeName="+self.processid+":"+name+"&srsName=epsg:4326&maxFeatures=10000&outputFormat=json");
			var colors = ["red", "yellow", "orange"];
			var context = {
                getColor: function(feature) {
                	if (feature.data.ID != null)
                		return colors[feature.data.ID];
                	else return "blue";
                }
            };
            var template = {
                fillOpacity: 0, 
                strokeColor: "${getColor}", // using context.getColor(feature)
                stokeWidth: "2px"
            };
            //var style = new OpenLayers.Style(template, {context: context});
			
			
			 
			if (name.match("grid")){
				//map.addLayer(layer);
				self.name = name;
				$.ajax({
					url:url,
					dataType: 'json',
					name: name,
					success: function(data) {
						self.layers[this.name] = L.geoJson(data,{style: self.gridStyle}).addTo(map);
					}
				}).done(function(){
					self.bounds = self.layers.grid.getBounds();
					map.fitBounds(self.bounds);
					map.setZoom(12);
				});
				//Grid is just one layer and can be visible
				//layer.setVisibility(true);
				self.layers.rekengrid = name;
			}            
			if (name.match("_cv")){
				//layer.setVisibility(false);
				//map.addLayer(layer);
				$.ajax({
					url:url,
					dataType: 'json',
					name: name,
					success: function(data) {
						var layer = L.geoJson(data,{
							style:self.contourStyle,
							onEachFeature: self.onEachFeature
						});
						layer.name = this.name;
						self.layers.vector.push(layer);
					}
				});
				//self.layers.vector.push(name);
			}
			

		});
		//Move back to map
		$("#timeslider").slider("enable");
		$.mobile.loading( 'hide' )
		$.mobile.changePage('#mappage');
	}
	
	
	
	//deactivate all functionality from this modelresults
   this.deactivate = function(){
	   this.stop();
	   //set all layers invisible
	   var name = self.layers.rekengrid;
	   var arr = map.getLayersByName(name);
	   arr[0].setVisibility(false);
	   for (var i=0;i<self.layers.vector.length;i++){
				var name = self.layers.vector[i];
				var arr = map.getLayersByName(name);
				arr[0].setVisibility(false);
				var name = self.layers.raster[i];
				var arr = map.getLayersByName(name);
				arr[0].setVisibility(false);
				var name = self.layers.wind[i];
				var arr = map.getLayersByName(name);
				arr[0].setVisibility(false);
				var name = self.layers.profiel[i];
				var arr = map.getLayersByName(name);
				arr[0].setVisibility(false);
				var name = self.layers.cone[i];
				var arr = map.getLayersByName(name);
				arr[0].setVisibility(false);
	   }
		  
   }
   
   this.clearOldLayers  = function(){
   	   //var oldlayers = map.getLayersByClass("OpenLayers.Layer.Vector");
   	   //for (var i = 0 ; i<oldlayers.length;i++)
   	   //	   map.removeLayer(oldlayers[i]);
   	   //map.removeLayer(layers['']); //TODO
   }
	
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
		var min = 0;
		var range = this.range;

		//Set layers inside min/max visible
		for (var i=min;i<=step;i++){
			//Only do that for vector layer
			self.layers.vector[i].addTo(map);
			if (i == step)
				self.layers.vector[i].setStyle(self.contourStyle);
			else
				self.layers.vector[i].setStyle(self.contourStyleOpaq);
		}
		
		//Rest of layers only shown at T max step
		//var name = self.layers.raster[step];
		//var arr = map.getLayersByName(name);
		//arr[0].setVisibility(visibleLayers['raster']);
		
		//Show time
		var time = self.layers.vector[step].name.split("_")[1].split("-");
		var hr =  time[0];
		var minutes = time[1];
		var sec = time[2];
		var timestring = time[0] + ":" + time[1];
		$("#timebox").html(timestring);

		//Set layers outside min/max invisible
		for (var i=0;i<self.layers.vector.length;i++){
			if (i < min || i > step){ //vector outside range
				map.removeLayer(self.layers.vector[i]);
			}
			if (i != step){ //rest of layers outside step
				
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

	//Get the parameters of the process for display
	var url= ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getprocessinfo&datainputs=[processid='+processid+']');
	$.ajax({url:url,success:function(result){
		self.processParams(result);
	}});
	
	
	
} 

/****
	End of rookpluimresults
****/
