<?php
/***
 This scripts runs SQL statements for converting the terrain model into rasters ready for landscape generation
***/

include_once ("globals.php");

//Get coordinates in WGS84
$lower = $_REQUEST['lower']?:5.9086;
$left  = $_REQUEST['left']?:52.0221;
$upper = $_REQUEST['upper']?:5.9580;
$right = $_REQUEST['right']?:52.0519;

$maxarea = 15000; //m2
$area = (($upper - $lower) * ($right - $left)) / 10000; //m2 

if ( $area > $maxarea){
	die("Area too big. <br> Selected: $area <br> Max: $maxarea");
}


/****
Stap 1: maak subset van terrein
****/
$query = "

SET work_mem TO 1200000;
SET maintenance_work_mem TO 1200000;
DROP SEQUENCE IF EXISTS counter;
CREATE SEQUENCE counter;

DROP TABLE IF EXISTS model_wildfire.terrein;
CREATE TABLE model_wildfire.terrein As (
WITH selectionbox AS (
	SELECT 
	ST_Transform(
		ST_SetSrid(ST_MakeBox2D(
			ST_Point($left, $lower), -- linksonder (x,y)
			ST_Point($right,$upper)), -- rechtsboven (x,y)
		3857)
	,28992) As geom
)
SELECT 
	nextval('counter') As gid,
	a.typelandge, 
	a.typeland_1, 
	c.fuel_id,
	ST_Transform(
		(ST_Dump(ST_Intersection(a.geom, b.geom))).geom -- Dump to get rid of geomcollection after intersection
		,900913
	)::geometry(Polygon,900913) geom --typemodded to register correctly in geom_columns
FROM topography.terrein a, selectionbox b, model_wildfire.landuse2fuel c
	WHERE ST_Intersects(a.geom,b.geom)
	AND a.typelandge = c.landuse_id
)
;
--add primary key to be able to edit in geoserver
ALTER TABLE model_wildfire.terrein ADD PRIMARY KEY (gid);

";

$result = pg_query($conn, $query)
	or die (pg_last_error($conn));
	
echo "Subset successfully created";
?>
