<?php

//$contents = file_get_contents('http://ilsc.cloudapp.net/gps/latest') or die('Not able to open remote file');
//echo $contents;


$opts = array('http' =>
    array(
        'method'  => 'GET',
        //'user_agent '  => "Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.2) Gecko/20100301 Ubuntu/9.10 (karmic) Firefox/3.6",
        'header' => array(
            'Content-Type: application/vnd.google-earth.kml+xml'
        ), 
    )
);
$context  = stream_context_create($opts);

//$f = file_get_contents("http://ilsc.cloudapp.net/gps/latest", false, $context);
$f = file_get_contents("http://research.geodan.nl/moovida/GetFeed?format=kml", false, $context);
echo $f;

?>
