<?php
/***
 This scripts runs SQL statements for converting the terrain model into rasters ready for landscape generation
***/

include_once ("globals.php");

/****
Stap 1: Maak raster ahv landgebruik aan 
****/
$query = "
DROP SEQUENCE IF EXISTS counter;
CREATE SEQUENCE counter;

DROP TABLE IF EXISTS model_wildfire.fuelmodel;
CREATE TABLE model_wildfire.fuelmodel As


 WITH /** Eerst een canvas laag aan de hand waarvan we de overige lagen uitlijnen **/
canvas AS ( 
	SELECT 
	 ST_AddBand(
		ST_MakeEmptyRaster(
			foo1.rast -- op basis van het ahn raster
--			200, 200, 	-- hoogte, breedte in pixels (heeft geen invloed op resultaat)
--			ST_XMin(e), 	-- linksboven x
--			ST_YMax(e), 	-- linksboven y
--			10,-10, 		-- resolutie x,y; 
--			0, 0, 		-- skew x, y;
--			28992  		-- srid epsg;
		) 
	 ,'8BUI'::text,0) As rast
        FROM 
        --(SELECT ST_Extent(geom) As e FROM model_wildfire.terrein) As foo,
        	(SELECT rast FROM dems.ahn1 LIMIT 1) As foo1
),
/** Voeg de geometrieen van gelijke typen samen **/
collections As (
	SELECT 
		CASE -- Laat alle xxx 3 meter uitsteken
			WHEN fuel_id > 999 THEN ST_Collect(St_Buffer(geom, 3))
			ELSE ST_Collect(geom)
		END As geom, 
		typelandge, 
		typeland_1, 
		fuel_id
	FROM model_wildfire.terrein
	GROUP BY typelandge, typeland_1, fuel_id
	
)
/** Stamp rasters uit de geometrieen. Voor elke type 1 **/
,layers As(
	SELECT nextval('counter') As rid,typelandge,typeland_1, fuel_id,
		ST_AsRaster(geom, 
			canvas.rast
			,'8BUI',fuel_id,0
		) rast
	FROM collections, canvas
)

SELECT 1 As rid, 
ST_Union(rast) rast 
FROM layers;

--DROP TABLE IF EXISTS model_wildfire.fuelmodel_mercator;
--CREATE TABLE model_wildfire.fuelmodel_mercator As
--SELECT 1 As rid, ST_Resample(rast, 3857) rast FROM model_wildfire.fuelmodel; 
";



$result = pg_query($conn, $query)
or die ("Query : $query ".pg_last_error($conn));
/****
Stap 3: Maak ahn raster aan op basis van box 
****/

$query = "
DROP TABLE IF EXISTS model_wildfire.ahn1;
CREATE TABLE model_wildfire.ahn1 As
WITH 
fuelmodext As (
SELECT ST_SetSrid(ST_Extent(rast::geometry),28992) extent FROM model_wildfire.fuelmodel
),

mosaic As (
SELECT ST_Union(a.rast) rast 
	FROM dems.ahn1 a, fuelmodext x
	WHERE ST_Intersects(a.rast,x.extent)
)

SELECT 1 AS rid, ST_Clip(a.rast, extent, true) rast
FROM mosaic a,
fuelmodext b;


UPDATE model_wildfire.ahn1 SET rast = ST_Reclass(rast,1,'
		-3.4028234663853e+38--30.0:-999--999, 
		-30.0-0.0:-30-0, 
		0.0-254.0:0-254', 
	'32BF',-999);
	
--UPDATE model_wildfire.ahn1 SET rast = ST_SetBandNoDataValue(rast,-999);


DROP TABLE IF EXISTS model_wildfire.ahn1_utm;
CREATE TABLE model_wildfire.ahn1_utm As
SELECT 1 As rid, ST_Resample(rast, 32631) rast FROM model_wildfire.ahn1;
";

$result = pg_query($conn, $query)
	or die ("Query : $query ".pg_last_error($conn));

/****
Stap 4: Maak lege raster aan op basis van bovenstaande terrein raster 
****/	
$query = "

DROP TABLE IF EXISTS model_wildfire.emptyraster;
CREATE TABLE model_wildfire.emptyraster As

WITH /** Eerst een canvas laag aan de hand waarvan we de overige lagen uitlijnen **/
canvas AS ( 
	SELECT 
	 ST_AddBand(
		ST_MakeEmptyRaster(
			rast
		) 
	 ,'8BUI'::text,0) As rast
        FROM (SELECT rast FROM model_wildfire.fuelmodel) As foo
)	

SELECT 1 As rid, rast FROM canvas;
";
$result = pg_query($conn, $query)
	or die (pg_last_error($conn));

	
/****
Stap 5: Exporteer BAG panden naar subset 
****/
$query = "
WITH selectionbox AS (
	SELECT ST_Extent(rast) extent FROM model_wildfire.fuelmodel 
)

CREATE TABLE model_wildfire.panden AS
SELECT a.* FROM dems.pand a, selectionbox b  
WHERE ST_Intersects(a.geom,ST_SetSrid(b.extent,28992)); ";
//$result = pg_query($conn, $query)
//	or die (pg_last_error($conn));
?>
