<?php
/***
 This scripts exports the postgres  rasters into ascii rasters
***/

include_once ("globals.php");

$pg_host = '192.168.40.5'
$pg_port = '3389';
$pg_dbase= 'research';
$pg_user = 'tomt';
$pg_pass = 'Gehijm';
$pg_schema = 'model_wildfire';

//Fuelmodel
$execstring = $gdal_translate_path . " -of AAIGrid -outsize 100% 100% \"PG:host=$pg_host port=$pg_port dbname=$pg_dbase user=$pg_user password=$pg_pass schema=$pg_schema table=fuelmodel\" $output_path/fuelmodel.asc"; 

exec($execstring)
	or die("Error in $execstring");

//Fuelmodel mercator
$execstring = $gdal_translate_path . " -of GTiff  $output_path/fuelmodel.asc $output_path/fuelmodel.tiff"; 
exec($execstring) or die("Error in $execstring");	

$execstring = $gdalwarp_path . " -overwrite -s_srs 'epsg:28992' -t_srs 'epsg:900913' $output_path/fuelmodel.tiff $output_path/fuelmodel_900913.tiff"; 
exec($execstring) or die("Error in $execstring");


//ahn	
$execstring = $gdal_translate_path . " -of AAIGrid -outsize 100% 100% \"PG:host=$pg_host port=$pg_port dbname=$pg_dbase user=$pg_user password=$pg_pass schema=$pg_schema table=ahn1\" $output_path/ahn1.asc";

exec($execstring)
	or die("Error in $execstring");
//asc to tiff
$execstring = $gdal_translate_path . " -a_nodata -999 -of GTiff  $output_path/ahn1.asc $output_path/ahn1.tiff"; 
exec($execstring) or die("Error in $execstring");	
//ahn mercator
$execstring = $gdalwarp_path . " -overwrite -srcnodata -999 -dstnodata -999 -s_srs 'epsg:28992' -t_srs 'epsg:900913' $output_path/ahn1.tiff $output_path/ahn1_900913.tiff"; 
exec($execstring) or die("Error in $execstring");

//ahn UTM
$execstring = $gdal_translate_path . " -of AAIGrid -a_nodata -999 -outsize 100% 100% \"PG:host=$pg_host port=$pg_port dbname=$pg_dbase user=$pg_user password=$pg_pass schema=$pg_schema table=ahn1_utm\" $output_path/ahn1_utm.asc";

exec($execstring)
	or die("Error in $execstring");
//emptyraster	
$execstring = $gdal_translate_path . " -of AAIGrid -outsize 100% 100% \"PG:host=localhost dbname='models' user='tomt' password='tomt' schema='model_wildfire' table=emptyraster\" $output_path/emptyraster.asc";

exec($execstring)
	or die("Error in $execstring");

include_once('reload_geoserver.php');
	
?>
