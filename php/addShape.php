<?php
/** Example curl
curl -u admin:geoserver -XPUT -H 'Content-type: text/plain' \
   -d 'file:///data/shapefiles/roads/roads.shp' \
   http://localhost:8080/geoserver/rest/workspaces/farsite/datastores/output/external.shp
**/

include_once('globals.php');

$shapefile = $_REQUEST['shapefile'];

 // Open log file
    $logfh = fopen("GeoserverPHP.log", 'w') or die("can't open log file");
// Initiate cURL session
    $service = "/geoserver/"; // replace with your URL
    
    $request = "rest/workspaces/datastores"; // to add a new workspace
    $url = $service . $request;
    $ch = curl_init($url);

    // Optional settings for debugging
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); //option to return string
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    curl_setopt($ch, CURLOPT_STDERR, $logfh); // logs curl messages

    //Required POST request settings
    curl_setopt($ch, CURLOPT_POST, True);
    $passwordStr = "admin:password"; // replace with your username:password
    curl_setopt($ch, CURLOPT_USERPWD, $passwordStr);
    
    //POST data
    curl_setopt($ch, CURLOPT_HTTPHEADER,
              array("Content-type: application/xml"));
    $xmlStr = "<workspace><name>test_ws</name></workspace>";
    curl_setopt($ch, CURLOPT_POSTFIELDS, $xmlStr);

    //POST return code
    $successCode = 201;

    $buffer = curl_exec($ch); // Execute the curl request
    
    // Check for errors and process results
    $info = curl_getinfo($ch);
    if ($info['http_code'] != $successCode) {
      $msgStr = "# Unsuccessful cURL request to ";
      $msgStr .= $url." [". $info['http_code']. "]\n";
      fwrite($logfh, $msgStr);
    } else {
      $msgStr = "# Successful cURL request to ".$url."\n";
      fwrite($logfh, $msgStr);
    }
    fwrite($logfh, $buffer."\n");

    curl_close($ch); // free resources if curl handle will not be reused
    fclose($logfh);  // close logfile
?>
