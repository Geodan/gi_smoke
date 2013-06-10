<?

//Reload geoserver config
// Initiate cURL session
$logfh = fopen("/var/www/wildfire/output/GeoserverPHP.log", 'w') or die("can't open log file");
$service = "/geoserver/"; // replace with your URL
$request = "rest/reload"; // to add a new workspace
$url = $service . $request;
$ch = curl_init($url);

 // Optional settings for debugging
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); //option to return string
curl_setopt($ch, CURLOPT_VERBOSE, true);
curl_setopt($ch, CURLOPT_STDERR, $logfh); // logs curl messages

//Required POST request settings
curl_setopt($ch, CURLOPT_POST, True);
$passwordStr = "admin:Gehijm"; // replace with your username:password
curl_setopt($ch, CURLOPT_USERPWD, $passwordStr);

//POST data
curl_setopt($ch, CURLOPT_HTTPHEADER,
		  array("Content-type: application/xml"));
$xmlStr = "<workspace><name>test_ws</name></workspace>";
curl_setopt($ch, CURLOPT_POSTFIELDS, $xmlStr);

//POST return code
$successCode = 200;
$buffer = curl_exec($ch); // Execute the curl request

// Check for errors and process results
$info = curl_getinfo($ch);
if ($info['http_code'] != $successCode) {
  $msgStr = "# Unsuccessful cURL request to ";
  $msgStr .= $url." [". $info['http_code']. "]\n";
  die($msgStr);
}
curl_close($ch); // free resources if curl handle will not be reused
//$execstring = "/usr/bin/curl -uadmin:Gehijm -XPOST http://localhost:8080/geoserver/rest/reload";
//exec($execstring) or die("Error in curl execution");
	?>
