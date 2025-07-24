<?php

    // This serves as an example endpoint for the CityFinder project.
    // https://github.com/jovanyoshioka/CityFinder

    // The below header enables requests from the frontend app. Setting the value
    // to '*' is dangerous since it will allow any app to access this API. When deployed
    // to GitHub pages, only include CityFinder's URL below.
    // header('Access-Control-Allow-Origin: *');

    $data = array('msg' => 'Successfully called test endpoint!');
    echo json_encode($data);

?>