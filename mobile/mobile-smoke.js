
/**
When userinfo is available, create a list of runs from that user and prepare grid
**/
$.fn.filterNode = function(name) {
      return this.find('*').filter(function() {
        return this.nodeName === name;
      });
    };
var ProcessIdData = [[]];
var tmp2;
var modelresults;
var userinfoReady = function(response) {
		$xml = $( response );
		var nodeException = $xml.find('ows\\:Exception, Exception');
		if (nodeException.length > 0) //error, show a message
		{
			console.warn($xml.find('ows\\:ExceptionText, ExceptionText').text());
			return;
		}
		
		var processlist, archivelist, titlelist;
		
		var $outputs = $xml.find('wps\\:Output, Output');

		$outputs.each(function(){
			 if ($(this).find('ows\\:Identifier, Identifier').text() == 'archiveid')
				 archivelist = $(this).find('wps\\:LiteralData, LiteralData').text();
			 if ($(this).find('ows\\:Identifier, Identifier').text() == 'processid')
				 processlist = $(this).find('wps\\:LiteralData, LiteralData').text();
			 if ($(this).find('ows\\:Identifier, Identifier').text() == 'titlecase')
				 titlelist = $(this).find('wps\\:LiteralData, LiteralData').text();
		});
		
		var list = processlist.split(",");
		var titlelist = titlelist.split(",");
		var archivelist = archivelist.split(",");
		
		ProcessIdData = [];
		for (i=0;i<list.length;i++){
			n = list[i];
			title = titlelist[i];
			if (archivelist[i] == 0 || archivelist[i] == 2)
				archive = 0;
			else
				archive = 1;
			//if (archive == 0 || archive == 2) //TT: ook archive doen
			if (1==1)
			{
				ProcessIdData.push([]);
				t = ProcessIdData.length -1;
				ProcessIdData[t] = [];
				ProcessIdData[t].push([n]);
				ProcessIdData[t].push([title]);
				ProcessIdData[t].push([archive]);
			}
		}
		initPlumesList(ProcessIdData);
		
}

function initPlumesList(data) {
    $('#plumespage').page();
    $('<li>', {
            "data-role": "list-divider",
            text: "Existing plumes"
        })
        .appendTo('#plumelist');
    $.each(data, function() {
        addPlumeToList(this);
    });
    $('#plumeslist').listview('refresh');
    //map.events.register("addlayer", this, function(e) {
    //    addPlumeToList(e.layer);
    //});
}

function addPlumeToList(plume) {
    var item = $('<li>', {
            "data-icon": "check",
            "class": true ? "checked" : "" //TODO: way to find out if it is loaded in rookpluimresults
        })
        .append($('<a />', {
            text: plume[1][0] //TODO: weird array object
        	})
            .click(function() {
            	modelresults = new rookpluimresults($.trim(plume[0][0]), $.trim(plume[1][0]));
            	$.mobile.changePage('#mappage');
            	$.mobile.loading( 'show', {
					text: 'Loading',
					textVisible: true,
					theme: 'z',
					html: ""
				});
            })
        )
        .appendTo('#plumeslist');
    //layer.events.on({
    //    'visibilitychanged': function() {
    //        $(item).toggleClass('checked');
    //    }
    //});
}

function smokeRun(response) {
	this.startTime = new Date();
	this.firstStatus = true;
	this.prevStatus;
	this.resonse = response;
	this.processid;
	this.statusObj = {};
	this.eta = 0; //estim. time of arrival
	var self = this;
	//First time start, run is presumably accepted
	this.rookpluimStarted = function(response) {
		$xml = $( response );
		var nodeException = $xml.find('ows\\:Exception, Exception');
		if (nodeException.length > 0) //error, show a message
		{
			console.warn($xml.find('ows\\:ExceptionText, ExceptionText').text());
			return;
		}
		var $outputs = $xml.find("wps\\:Output, Output");
		$outputs.each(function(){
			if ($(this).find("ows\\:Identifier, Identifier").text() == 'processid')
				self.processid = $(this).find("LiteralData").text()
			if ($(this).find("ows\\:Identifier, Identifier").text() == 'titlecase')
				self.title = $(this).find("LiteralData").text()
		});
		if (self.processid != null) //we're done
		{
			$.ajax({
					url:ProxyHost+escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getstatusinfo&datainputs=[processid='+self.processid+']'),
					success: self.rookpluimRunning //continue with running status
			});
		}
		else console.warn('No processid returned by server');
	}
	//Now it is running, keep checking for the status
	this.rookpluimRunning = function(response) {
		$xml = $( response );
		var status;
		var duration;
		var order;
		var $outputs = $xml.find("wps\\:Output, Output");
		$outputs.each(function(){
			if ($(this).find("ows\\:Identifier, Identifier").text() == 'status')
				status = $(this).find("LiteralData").text()
			if ($(this).find("ows\\:Identifier, Identifier").text() == 'statusduration')
				duration = $(this).find("LiteralData").text()
			if ($(this).find("ows\\:Identifier, Identifier").text() == 'statusorder')
				order = $(this).find("LiteralData").text()
		});
		
		if (status == 'successfully') //we're done
		{
			$.ajax({
				url:ProxyHost+escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getmodelresults&datainputs=[processid='+self.processid+']'),
				success: self.rookpluimReady
			});
		}
		else //we're not done, stay in the loop
		{
			if (self.firstStatus) //first time status overview, build progressbars
			{
				self.firstStatus = false;
				var durationArr = duration.split(",");

				for (var i = 0;i<durationArr.length;i++)
					self.eta = self.eta + durationArr[i]; //Total time it will take
				var orderArr = order.split(",");
			}
			
			if (self.prevStatus && status != self.prevStatus){ //status update, timer reset
				$.mobile.loading( 'show', {
					text: status,
					textVisible: true,
					theme: 'z',
					html: ""
				});
			
			}
			if (status.match(/Error/g)){ 
					alert(status);
					return;
			}
			var seconds = (new Date() - self.startTime)/1000;
			var percentage = seconds / self.statusObj[status];
			self.prevStatus = status;
			var makeRequest = function() {
				$.ajax({
					url: ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getstatusinfo&datainputs=[processid='+self.processid+']'),
					success: self.rookpluimRunning
				});
			}
			var t=setTimeout(makeRequest,3000); //Loop every 3 secs
		}
			
	}
	//Server is ready, we can update 
	this.rookpluimReady = function(response) {
		$.ajax({
				url:  ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getuserinfo&datainputs=[userid='+currentUser+']'),
				success: function(response){
					userinfoReady(response);
					modelresults = new rookpluimresults(self.processid, self.title);
				}
			});
		
	}
	//fireoff the process of checking the model status upon creation of the object 
	this.rookpluimStarted(response);
}

//Has the actions for the smoke start page 
$(document).ready(function(){
//Geocomplete thanks to:
//http://ubilabs.github.io/geocomplete/examples/simple.html
	var url= ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=getuserinfo&datainputs=[userid='+currentUser+']');
	$.ajax({url:url,success:function(result){
		userinfoReady(result);
	}});
	  
	$("#geocomplete").geocomplete()
	  .bind("geocode:result", function(event, result){
		console.log("Result: " + result.formatted_address);
		var $lat = $("#lat");
		var $lon = $("#lon");
		$lat.val(result.geometry.location.jb);
		$lon.val(result.geometry.location.kb);
	  })
	  .bind("geocode:error", function(event, status){
		console.log("ERROR: " + status);
	  })
	  .bind("geocode:multiple", function(event, results){
		console.log("Multiple: " + results.length + " results found");
	  });
	$("#start").click(function(){
		$.mobile.loading( 'show', {
			text: 'Running model',
			textVisible: true,
			theme: 'z',
			html: ""
		});
		$.mobile.changePage('#mappage');
		var now = new Date();
		var later = new Date();
		var later = later.setHours(later.getHours()+5);
		var later = new Date(later); //TODO, ouch..
		var runname = $('#runname').val();
		if (runname)
		    var titlecase= runname;
		else
		    var titlecase= "Run_" + now.getTime().toString();
		var epsg=32631;
		var begYear=now.getFullYear();
		var begMonth=now.getMonth()+1;
		var begDay=now.getDate();
		var begtime=now.getHours() + ":" + now.getMinutes();
		var endYear=later.getFullYear();
		var endMonth=later.getMonth()+1;
		var endDay=later.getDate();
		var endtime=later.getHours() + ":" + later.getMinutes();
		var x = $('#lon').val();
		var y = $('#lat').val();
		var point = new Proj4js.Point( parseFloat(x), parseFloat(y) ); 
		var fromProjection = new Proj4js.Proj('WGS84');    
		var toProjection = new Proj4js.Proj('EPSG:32631');
		var pointnew = Proj4js.transform(fromProjection, toProjection, point);
		x = pointnew.x / 1000;
		y = pointnew.y /1000;
		begDate = ''+begYear+'-'+begMonth+'-'+begDay+'_'+begtime+':00';
		endDate = ''+endYear+'-'+endMonth+'-'+endDay+'_'+endtime+':00';
		var species=$('#select-choice-0').val();
		var emission=$('#emissie').val();
		var temperature=$('#temperatuur').val();
		var timesteps=1;
		var surface=1000;
		var stackheight=1;
		var typeoffire='area';
		var typeofleak=1;
		var gridsize=150;
		
		
		var url= ProxyHost + escape('http://smoke-plume.argoss.nl/cgi-bin/pywps.cgi?service=wps&version=1.0.0&request=execute&identifier=startcalpuffv4&datainputs=[userid='+ currentUser + ';titlecase='+titlecase+';epsg='+epsg+';xcrd='+x+';ycrd='+y +';begtime='+begDate+';endtime='+endDate+';species='+species+';emission='+emission+';surface='+surface+';stackheight='+stackheight+';timesteps='+timesteps+';temperature='+temperature+';typeoffire='+typeoffire+';gridsize='+gridsize+';validateonly=no;]');
		  $.ajax({url:url,success:function(result){
			new smokeRun(result);
		  }
		  });
	});
	$("#examples a").click(function(){
	  $("#geocomplete").val($(this).text()).trigger("geocode");
	  return false;
	});
	
	//Slider func
	$("#timeslider").hide(); //only hide number
	//$("#timeslider").slider("disable");
	$('#timeslider').change(function(){
        var slider_value = $(this).val();
        modelresults.showStep(slider_value);
    })
});
