#import libs
import time
import sys
import json
import psycopg2
import os
import subprocess

os.chdir("/var/www/wildfire/output")
class farsiteRun():
	def updateStatus(self,runid, status, percentage):
		query = """
			UPDATE administration.runs SET (status, percentage, lastupdate)
			= (%s, %s, now())
			WHERE id = %s"""
		data = (status, percentage, runid, )
		self.cur.execute(query, data )
		self.conn.commit()
		return
	
	
	def main(self,result):
		runid = result[0]
		cur = self.cur	
		self.updateStatus(runid, "running", 10)
		
		#Get point data
		query = "SELECT point, weatherstring, windstring, startmonth, startday, starthour, fuelmodel FROM administration.params_farsiterun WHERE run = %s;"
		data = (runid, )
		cur.execute(query, data )
		res = cur.fetchone()
		point = str(res[0]).replace(" ","%20").replace(".",",")
		weatherString = str(res[1])
		windString = str(res[2])
		startMonth = str(res[3])
		startDay   = str(res[4])
		startHour  = str(res[5])
		fuelmodel  = str(res[6])
		template = "template_" + str(runid) + ".tpl"
		#TODO: create a new tpl file
		f = open('/var/www/wildfire/cgi-bin/'+template, 'w')
		f.write("""
			version=42
			adjustmentfile=/var/www/wildfire/input/Factor_1.ADJ
			fuelmoisturefile=/var/www/wildfire/input/Low.FMS
			fuelmodelfile=
			weatherfile0={weatherfile}
			windFile0={windfile}
			landscapefile=/var/www/wildfire/output/%s/landscape.lcp
			burnperiodefile=
			timestep={timestep}
			visiblestep={visiblestep}
			secondaryvisiblestep={secondaryvisiblestep}
			perimeterresolution=60m
			distanceresolution=30
			enablecrownfire=true
			linkcrowndensityandcover=false
			embersfromtorchingtrees=true
			enablespotfiregrowth=false
			nwnsbackingros=false
			distanceChecking=fireLevel
			simulatePostFrontalCombustion=false
			fuelInputOption=absent
			calculationPrecision=normal
			useConditioningPeriod = true
			conditMonth = {conditMonth}
			conditDay = {conditDay}
			startMonth = {startMonth}
			startDay = {startDay}
			startHour = {startHour}
			startMin = {startMin}
			endMonth = {endMonth}
			endDay = {endDay}
			endHour = {endHour}
			endMin = {endMin}
			ignitionFile = {vctfile}
			ignitionFileType = {vcttype}
			vectMake = false
			# Therefore we don't need the vectorFilename property
			shapeMake = true
			shapeFile = /var/www/wildfire/output/bergen{id}_perim.shp
			rastMake = true
			rasterFilename = /var/www/wildfire/output/bergen{id}_raster
			#Now explicitly set ALL raster options..do not rely on defaults
			rast_arrivaltime = true
			rast_fireIntensity = true
			rast_spreadRate = true
			rast_flameLength = false
			rast_heatPerArea = false
			rast_crownFire = false
			rast_fireDirection = false
			rast_reactionIntensity = false
			""" % (fuelmodel))
		f.close()
		#Actual run
		url = 'http://192.168.40.11/wildfire/cgi-bin/farsite_service'
		curlstring = 'curl -G -d "id='+str(runid)+'&coords=' + point + '&template='+template+'&weather='+ weatherString +'&wind=' + windString + '&day='+startDay+'&month='+startMonth+'&hour='+startHour+'&min=00&interval=1&duration=6" ' + url
		
		#print callstring
		with open('logfile', "w") as outfile:
			subprocess.call(curlstring, stdout=outfile, shell=True)
		#subprocess.call(callstring, shell=True)
		
		self.updateStatus(runid, "running", 20)
		
		pgserver_host = '192.168.40.5'
		pgserver_port = '3389'
		callstring = 'ogr2ogr -f "PostgreSQL" PG:"host='+pgserver_host+' port='+pgserver_port+' user=tomt dbname=research password=Gehijm" -lco schema=model_wildfire -lco OVERWRITE=YES /var/www/wildfire/output/bergen'+str(runid)+'_perim.shp'
		subprocess.call(callstring, shell=True)	
		
		#Simplify the geometry
		query = """
			UPDATE model_wildfire.bergen%s_perim SET wkb_geometry = ST_SimplifyPreserveTopology(wkb_geometry,10);
			""" % (str(runid))
		cur.execute(query )
		#result = cur.fetchone()
		self.updateStatus(runid, "running", 50)
		#TODO: error checking
		curlstring = 'curl -v -u admin:Gehijm -XPOST -H "Content-type: text/xml" -d "<featureType><name>bergen'+str(runid)+'_perim</name></featureType>" http://192.168.40.8:3389/geoserver/rest/workspaces/model_wildfire/datastores/landuse/featuretypes'	
		os.system(curlstring)
		curlstring = 'curl -v -u admin:Gehijm -XPUT -H "Content-type: text/xml" -d "<featureType><nativeCRS>EPSG:28992</nativeCRS></featureType>" http://192.168.40.8:3389/geoserver/rest/workspaces/model_wildfire/datastores/landuse/featuretypes/bergen'+str(runid)+'_perim'
		os.system(curlstring)
		curlstring = 'curl -v -u admin:Gehijm -XPUT -H "Content-type: text/xml" -d "<featureType><srs>EPSG:28992</srs></featureType>" http://192.168.40.8:3389/geoserver/rest/workspaces/model_wildfire/datastores/landuse/featuretypes/bergen'+str(runid)+'_perim'
		os.system(curlstring)
		#Freakin bug, you have to add 'enabled': http://comments.gmane.org/gmane.comp.gis.geoserver.user/26753
		curlstring = 'curl -v -u admin:Gehijm -XPUT -H "Content-type: text/xml" -d "<layer><defaultStyle><name>isochrones</name></defaultStyle><enabled>true</enabled></layer>" http://192.168.40.8:3389/geoserver/rest/layers/model_wildfire:bergen'+str(runid)+'_perim'
		os.system(curlstring)
		
		
		self.updateStatus(runid, "finished", 100)
		return
	
	def start(self):
		#Set postgres connection
		conn_params = "host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm"
		conn = psycopg2.connect(conn_params)
		cur = conn.cursor()
		self.conn = conn
		self.cur = cur
		self.conn_params = conn_params
		#Get the first available scheduled run
		query = """
			SELECT a.id
			FROM administration.runs a 
			WHERE a.status = 'scheduled'
			AND a.model = 5
			ORDER BY a.id
			LIMIT 1;
			"""
		cur.execute(query )
		result = cur.fetchone()
		
		if (result):
			self.main(result)
	
if __name__ == "__main__":
	obj = farsiteRun()
	obj.start()
	print('not to be run as standalone')

