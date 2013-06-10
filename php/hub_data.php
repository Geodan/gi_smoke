<?php

include_once 'globals.php';

$task = $_REQUEST['task'];
 
$tablename = $_REQUEST['tablename'];
	
switch($task){
    case "CREATE":
        addData($tablename);
        break;
    case "READ":
        showData($tablename);
        break;
    case "UPDATE":
        saveData($tablename);
        break;
    case "DESTROY":
        removeData($tablename);
        break;
    default:
        echo "{failure:true}";
        break;
}//end switch	
	
function removeData($tablename){
	global $conn;
	$d    = $_REQUEST['results'];
	$arr = json_decode(stripslashes($d));
	if (is_array($arr[0]) == false) {
		$data[0] = $arr;
	}
	else {
		$data = $arr;
	}
	foreach($data as $row_id)
    {
        $id = (integer) $row_id;
        $query = 'DELETE FROM model_wildfire.'.$tablename.' WHERE id = '.$id;
        $result = pg_query($conn,$query)
        or die('{failure: true, message: "'.pg_last_error($conn).'"}'); //returns number of rows deleted
        if ($result) $count++;
    }
    if ($count) {
        echo '{success: true, del_count: '.$count.'}';
    } else {
        echo '{failure: true}';
    }
    
}	

function showData($tablename){
	global $conn;
	$query = "SELECT * FROM model_wildfire.$tablename;";
	$myarray = array();
	
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
}

function saveData($tablename){
	global $conn;
	if(get_magic_quotes_gpc()){
		$d = stripslashes($_REQUEST['results']);
	}else{
		$d = $_REQUEST['results'];
	}
	$arr = json_decode($d,true);
	
	if (is_array($arr[0]) == false) {
		$data[0] = $arr;
	}
	else {
		$data = $arr;
	}
 
	foreach ($data as $row){
	$updateArray = Array();
		foreach($row as $key=>$value){
		 $updateArray[] = "$key = '$value'"; 
		}
		$updateString = implode($updateArray,",");
		unset($updateArray);
		$query = "UPDATE model_wildfire.$tablename SET $updateString WHERE id = ". $row['id'].";";
		$result = pg_query($conn, $query)
		or die("{'succes': false, 'message': 'Error in query $query : ". pg_last_error($conn)."'}");
	}
	 echo "{'succes': true}";
}

function addData($tablename){
	global $conn;
	if(get_magic_quotes_gpc()){
		$d = stripslashes($_REQUEST['results']);
	}else{
		$d = $_REQUEST['results'];
	}
	$data_array = json_decode($d,true);

	foreach($data_array as $key => $value)
		{
			$colArray[] = "$key";
			$valArray[] = "'$value'";
		}


	$colString = implode($colArray,",");
	$valString = implode($valArray,",");
	
	$query = "INSERT INTO model_wildfire.$tablename ($colString) VALUES ($valString);";

	$result = pg_query($conn, $query)
		or die("{'succes': false, 'message': 'Error in query $query : ". pg_last_error($conn)."'}");
		
	//Get the last inserted id:
	
	echo "{'succes': true, 'message':'created records'}";
}


?>


