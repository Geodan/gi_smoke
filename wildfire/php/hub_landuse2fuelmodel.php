<?php

$task = $_REQUEST['task'];


switch($task){
    case "create":
        addData();
        break;
    case "read":
        showData();
        break;
    case "update":
        saveData();
        break;
    case "delete":
        removeData();
        break;
    default:
        echo "{failure:true}";
        break;
}//end switch	
	
function removeData(){
	$arr    = $_POST['idlist'];
	$selectedRows = json_decode(stripslashes($arr));
	foreach($selectedRows as $row_id)
    {
        $id = (integer) $row_id;
        $query = 'DELETE FROM `'.$table.'` WHERE `'.$key.'` = '.$id;
        $result = pg_query($query); //returns number of rows deleted
        if ($result) $count++;
    }
    if ($count) {
        echo '{success: true, del_count: '.$count.'}';
    } else {
        echo '{failure: true}';
    }
    
}	

function showData(){

	$query = "SELECT * FROM model_wildfire.landuse2fuel";
	$myarray = array();
	$result = pg_query($conn, $query);
	$num = pg_numrows($result);
	
	$i = 0;
	
	while ($row = pg_fetch_assoc($result)) {
	
		$array["results"][$i] = $row;
		$i++;
	}
	
	$data = json_encode($array);
	echo '({"total":"' . pg_numrows($result) . '","results":' . $data . '})';
}

function saveData(){
	
 if(get_magic_quotes_gpc()){
		$d = stripslashes($_REQUEST['results']);
	}else{
		$d = $_REQUEST['results'];
	}
	$arr = json_decode($d,true);
 
 $fuel_name = $arr['fuel_name']?:" ";
 $lu_name = $arr['landuse_name']? :" ";
 $fuel_id = $arr['fuel_id']?: -1;
 
 $query = "UPDATE model_wildfire.landuse2fuel SET landuse_name = '$lu_name', fuel_name = '$fuel_name', fuel_id = $fuel_id WHERE id = ". $arr['id'].";";
 $result = pg_query($conn, $query);
 echo "{'succes': true}";
 
}

function addData(){
	if(get_magic_quotes_gpc()){
		$d = stripslashes($_REQUEST['results']);
	}else{
		$d = $_REQUEST['results'];
	}
	$data_array = json_decode($d,true);
	
	$landuse_id = $data_array['landuse_id']?:0;
	$landuse_name = $data_array['landuse_name']?:'unknown';
	$fuel_id = $data_array['fuel_id']?:0;
	$fuel_name = $data_array['fuel_name']?:'unknown';
	
	$query = "INSERT INTO model_wildfire.landuse2fuel (landuse_id, landuse_name, fuel_id, fuel_name) VALUES ($landuse_id, '$landuse_name', $fuel_id, '$fuel_name');";
	//echo $query;
	$result = pg_query($conn, $query)
	or die("{'succes': false}");
	echo "{'results':{'succes': true}}";
}


?>


