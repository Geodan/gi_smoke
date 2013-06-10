<?php

include_once ('globals.php');



$execstring = "$lcpmake_path -landscape $output_path/landscape -elevation $output_path/emptyraster.asc -slope $output_path/emptyraster.asc -aspect $output_path/emptyraster.asc -fuel $output_path/fuelmodel.asc -cover $output_path/emptyraster.asc -latitude 90";

$last_line = system($execstring ." > /dev/null", $retval);
if ($retval == 0) { 
	echo "Landscape file successfully created";
} 
else { 
	echo "Something went wrong while creating the landscape file. Error value: $retval";
}
?>
