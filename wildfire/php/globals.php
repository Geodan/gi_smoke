<?php
	/** Dbase settings **/
	$conn = pg_connect("host=192.168.40.5 port=3389 dbname=research user=tomt password=Gehijm");
	
	/** Path settings **/
	$gdal_translate_path = '/usr/local/bin/gdal_translate';
	$gdalwarp_path = '/usr/local/bin/gdalwarp';
	$lcpmake_path = '/var/www/wildfire/bin/lcpmake';
	$farsite_path = '/var/www/wildfire/bin/farsite4';
	$output_path  = '/var/www/wildfire/output';
	
?>
