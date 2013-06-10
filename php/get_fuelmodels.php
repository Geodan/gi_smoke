<?php

include_once 'globals.php';

global $conn;

 $query = "SELECT id As fuel_id, carrier || id || ' | ' || description  As description 
 FROM  model_wildfire.fuelmodels 
 WHERE climate = 'humid' OR climate = 'dry' OR climate Is Null
 ORDER BY id" ;

 	$result = pg_query($conn, $query)
	 or die("Error in $query" . pg_last_error($conn));
	$num = pg_numrows($result);
	
	$i = 0;
	
	while ($row = pg_fetch_assoc($result)) {
	
		$array[$i] = $row;
		$i++;
	}
	
	$data = json_encode($array);
	echo '({"total":"' . pg_numrows($result) . '","results":' . $data . '})';
 
?>
