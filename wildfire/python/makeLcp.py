#import libs
import time
import sys
import json
import psycopg2
import os
import subprocess
#from apscheduler.scheduler import Scheduler

os.chdir("/var/www/wildfire/output")


class makeLcp():
	def updateStatus(self,runid, status, percentage):
		query = """
			UPDATE administration.runs SET (status, percentage, lastupdate)
			= (%(status)s, %(percentage)s, now())
			WHERE id = %(runid)s"""
		
		data = ({'status':status, 'percentage':percentage, 'runid':runid} )
		self.cur.execute(query, data )
		self.conn.commit()
		return
	
	
	def main(self):
		
		runid = self.runid
		terreinid = self.result[1]
		self.updateStatus(runid, "running", 10)
		print('running 10')
		
		#Stap 1: Maak raster ahv landgebruik aan
		query = """
		DROP SEQUENCE IF EXISTS counter;
	CREATE SEQUENCE counter;
	
	DROP TABLE IF EXISTS model_wildfire.fuelmodel_%(runid)s;
	CREATE TABLE model_wildfire.fuelmodel_%(runid)s As
	
	
	 WITH /** Eerst een canvas laag aan de hand waarvan we de overige lagen uitlijnen **/
	canvas AS ( 
		SELECT 
		 ST_AddBand(
			ST_MakeEmptyRaster(
				foo1.rast -- op basis van het ahn raster
			) 
		 ,'8BUI'::text,0) As rast
			FROM 
				(SELECT rast FROM dems.ahn1 LIMIT 1) As foo1
	),
	/** Voeg de geometrieen van gelijke typen samen **/
	collections As (
		SELECT 
			CASE -- Laat alle xxx 3 meter uitsteken
				WHEN fuel_id > 999 THEN ST_Collect(St_Buffer(geom, 3))
				ELSE ST_Collect(geom)
			END As geom, 
			typelandgebruik, 
			typelandgebruik_c1, 
			fuel_id
		FROM model_wildfire.terrein_%(terreinid)s
		GROUP BY typelandgebruik, typelandgebruik_c1, fuel_id
		
	)
	/** Stamp rasters uit de geometrieen. Voor elke type 1 **/
	,layers As(
		SELECT nextval('counter') As rid,typelandgebruik,typelandgebruik_c1, fuel_id,
			ST_AsRaster(geom, 
				canvas.rast
				,'8BUI',fuel_id,0
			) rast
		FROM collections, canvas
	)
	
	SELECT 1 As rid, 
	ST_Union(rast) rast 
	FROM layers;
		"""
		data = ({'runid':runid,'terreinid':terreinid})
		self.cur.execute(query,data )
		self.conn.commit()
	
		#Stap 3: Maak ahn raster aan op basis van box 
		query = """
	DROP TABLE IF EXISTS model_wildfire.ahn1_%(runid)s;
	CREATE TABLE model_wildfire.ahn1_%(runid)s As
	WITH 
	fuelmodext As (
		SELECT ST_SetSrid(ST_Extent(rast::geometry),28992) extent 
		FROM model_wildfire.fuelmodel_%(runid)s
	),
	
	mosaic As (
	SELECT ST_Union(a.rast) rast 
		FROM dems.ahn1 a, fuelmodext x
		WHERE ST_Intersects(a.rast,x.extent)
	)
	
	SELECT 1 AS rid, ST_Clip(a.rast, extent, true) rast
	FROM mosaic a,
	fuelmodext b;
	
	
	UPDATE model_wildfire.ahn1_%(runid)s SET rast = ST_Reclass(rast,1,'
			-3.4028234663853e+38--30.0:-999--999, 
			-30.0-0.0:-30-0, 
			0.0-254.0:0-254', 
		'32BF',-999);
	
	DROP TABLE IF EXISTS model_wildfire.ahn1_utm_%(runid)s;
	CREATE TABLE model_wildfire.ahn1_utm_%(runid)s As
	SELECT 1 As rid, ST_Resample(rast, 32631) rast FROM model_wildfire.ahn1_%(runid)s;
		"""
		data = ({'runid':runid})
		self.cur.execute(query,data )
		self.conn.commit()
		
		#Stap 4: Maak lege raster aan op basis van bovenstaande terrein raster
		query = """
	DROP TABLE IF EXISTS model_wildfire.emptyraster_%(runid)s;
	CREATE TABLE model_wildfire.emptyraster_%(runid)s As
	
	WITH /** Eerst een canvas laag aan de hand waarvan we de overige lagen uitlijnen **/
	canvas AS ( 
		SELECT 
		 ST_AddBand(
			ST_MakeEmptyRaster(
				rast
			) 
		 ,'8BUI'::text,0) As rast
			FROM (SELECT rast FROM model_wildfire.fuelmodel_%(runid)s) As foo
	)	
	
	SELECT 1 As rid, rast FROM canvas;
		"""
		data = ({'runid':runid})
		self.cur.execute(query,data )
		self.conn.commit()
		self.updateStatus(runid, "running", 50)
		print('starting gdal')
		subprocess.call(self.gdal_translate_path + " -of AAIGrid -outsize 100% 100% \"PG:host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm schema=model_wildfire table=fuelmodel_"+str(runid)+"\" "+ self.output_path + "/fuelmodel.asc", shell=True)      
		subprocess.call(self.gdal_translate_path + " -of GTiff  " + self.output_path+ "/fuelmodel.asc " + self.output_path + "/fuelmodel.tiff", shell=True)
		subprocess.call(self.gdalwarp_path + " -overwrite -s_srs epsg:28992 -t_srs epsg:900913 " + self.output_path + "/fuelmodel.tiff " + self.output_path + "/fuelmodel_900913.tiff", shell=True)
		subprocess.call(self.gdal_translate_path + " -of AAIGrid -outsize 100% 100% \"PG:host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm schema=model_wildfire table=ahn1_"+str(runid)+"\" " + self.output_path + "/ahn1.asc", shell=True)
		subprocess.call(self.gdal_translate_path + " -a_nodata -999 -of GTiff  " + self.output_path + "/ahn1.asc " + self.output_path + "/ahn1.tiff", shell=True)
		subprocess.call(self.gdalwarp_path + " -overwrite -srcnodata -999 -dstnodata -999 -s_srs epsg:28992 -t_srs epsg:900913 " + self.output_path + "/ahn1.tiff " + self.output_path + "/ahn1_900913.tiff", shell=True)
		subprocess.call(self.gdal_translate_path + " -of AAIGrid -a_nodata -999 -outsize 100% 100% \"PG:host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm schema=model_wildfire table=ahn1_utm_"+str(runid)+"\" " + self.output_path + "/ahn1_utm.asc", shell=True)
		subprocess.call(self.gdal_translate_path + " -of AAIGrid -outsize 100% 100% \"PG:host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm schema=model_wildfire table=emptyraster_"+str(runid)+"\" " + self.output_path + "/emptyraster.asc", shell=True)
		
		subprocess.call(self.lcpmake_path + " -landscape " + self.output_path + "/landscape -elevation " + self.output_path + "/emptyraster.asc -slope " + self.output_path + "/emptyraster.asc -aspect " + self.output_path + "/emptyraster.asc -fuel " + self.output_path + "/fuelmodel.asc -cover " + self.output_path + "/emptyraster.asc -latitude 90", shell=True)
		self.updateStatus(runid, "finished", 100)
		print('done')
		return
	
	def start(self):
		#Set postgres connection
		conn_params = "host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm"
		self.conn = psycopg2.connect(conn_params)
		self.cur = self.conn.cursor()
		
		
			
		#Get the first available scheduled run
		query = """
			SELECT a.id,b.terrein_id
			FROM administration.runs a 
			LEFT JOIN administration.params_makelcp b
			ON (a.id = b.run)
			WHERE a.status = 'scheduled'
			AND a.model = 4
			ORDER BY a.id
			LIMIT 1;
			"""
		self.cur.execute(query )
		self.result = self.cur.fetchone()
		if (self.result):
			print 'Starting main'
			self.runid = self.result[0] 
			#Define some params
			self.gdal_translate_path = '/usr/local/bin/gdal_translate'
			self.gdalwarp_path = '/usr/local/bin/gdalwarp'
			self.lcpmake_path = '/var/www/wildfire/bin/lcpmake'
			self.farsite_path = '/var/www/wildfire/bin/farsite4'
			self.output_path  = '/var/www/wildfire/output/' + str(self.runid)
			os.mkdir(self.output_path)
			self.main()       
		else:
			print 'No process to run'
		
		
if __name__ == "__main__":
	try:
		pid = os.fork()
		if pid:
			#print("Main thread with pid %s ends here" % pid)
			exit()
		else:
			#print("Child thread with pid %s contintues" % 0)
			si = file('/tmp/forklog', 'r')
			so = file('/tmp/forklog', 'a+')
			se = file('/tmp/forklog', 'a+', 0)
			os.dup2(si.fileno(), sys.stdin.fileno())
			os.dup2(so.fileno(), sys.stdout.fileno())
			os.dup2(se.fileno(), sys.stderr.fileno())
			pass

		obj = makeLcp()
		obj.start() 
	except OSError, e:
		print("Forking failed")
		traceback.print_exc(file='/tmp/forklog')
		raise ("Fork failed: %d (%s)\n" % (e.errno, e.strerror) )
		


